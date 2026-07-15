export type HardwareTransport = "bluetooth" | "usb" | "serial" | "network";

export type DeviceStatus = "idle" | "connected" | "disconnected" | "error";

export type DiscoveredDevice = {
  id: string;
  name: string;
  transport: HardwareTransport;
  status: DeviceStatus;
  vendorId?: number;
  productId?: number;
};

export type PrinterConnection = {
  id: string;
  name: string;
  transport: HardwareTransport;
  write: (bytes: Uint8Array) => Promise<void>;
  close: () => Promise<void>;
  reconnect: () => Promise<PrinterConnection>;
};

function textEncoder() {
  return new TextEncoder();
}

export function escPosTextReceipt(title: string, lines: string[]) {
  const encoder = textEncoder();
  const init = Uint8Array.from([0x1b, 0x40]);
  const center = Uint8Array.from([0x1b, 0x61, 0x01]);
  const left = Uint8Array.from([0x1b, 0x61, 0x00]);
  const cut = Uint8Array.from([0x1d, 0x56, 0x41, 0x10]);

  const chunks: Uint8Array[] = [
    init,
    center,
    encoder.encode(`${title}\n`),
    left,
  ];

  for (const line of lines) {
    chunks.push(encoder.encode(`${line}\n`));
  }

  chunks.push(encoder.encode("\n\n"));
  chunks.push(cut);

  return concatBytes(chunks);
}

export function escPosOpenDrawerCommand() {
  return Uint8Array.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

export function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function getHardwareSupport() {
  const nav = navigator as any;
  return {
    bluetooth: !!nav.bluetooth,
    usb: !!nav.usb,
    serial: !!nav.serial,
    camera: !!navigator.mediaDevices?.getUserMedia,
  };
}

export async function discoverConnectedDevices(): Promise<DiscoveredDevice[]> {
  const nav = navigator as any;
  const list: DiscoveredDevice[] = [];

  if (nav.bluetooth?.getDevices) {
    const devices: any[] = await nav.bluetooth.getDevices();
    for (const d of devices) {
      list.push({
        id: String(d.id ?? crypto.randomUUID()),
        name: String(d.name ?? "Bluetooth Device"),
        transport: "bluetooth",
        status: d.gatt?.connected ? "connected" : "disconnected",
      });
    }
  }

  if (nav.usb?.getDevices) {
    const devices: any[] = await nav.usb.getDevices();
    for (const d of devices) {
      list.push({
        id: `${d.vendorId ?? 0}:${d.productId ?? 0}`,
        name: `USB Device ${d.productName ?? "Unknown"}`,
        transport: "usb",
        status: d.opened ? "connected" : "disconnected",
        vendorId: d.vendorId,
        productId: d.productId,
      });
    }
  }

  if (nav.serial?.getPorts) {
    const ports: any[] = await nav.serial.getPorts();
    ports.forEach((_, index) => {
      list.push({
        id: `serial-${index + 1}`,
        name: `Serial Port ${index + 1}`,
        transport: "serial",
        status: "connected",
      });
    });
  }

  return list;
}

async function connectBluetoothDevice(device: any): Promise<PrinterConnection> {
  const create = async (): Promise<PrinterConnection> => {
    const gatt = await device.gatt.connect();
    const services = await gatt.getPrimaryServices();

    let writer: any = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      const found = chars.find((c: any) => c.properties?.writeWithoutResponse || c.properties?.write);
      if (found) {
        writer = found;
        break;
      }
    }

    if (!writer) throw new Error("No writable Bluetooth characteristic found");

    return {
      id: String(device.id),
      name: String(device.name ?? "Bluetooth Printer"),
      transport: "bluetooth",
      write: async (bytes) => {
        if (writer.properties?.writeWithoutResponse) {
          await writer.writeValueWithoutResponse(bytes);
        } else {
          await writer.writeValue(bytes);
        }
      },
      close: async () => {
        if (device.gatt?.connected) device.gatt.disconnect();
      },
      reconnect: async () => create(),
    };
  };

  return create();
}

async function connectUsbDevice(device: any): Promise<PrinterConnection> {
  const create = async (): Promise<PrinterConnection> => {
    await device.open();
    if (!device.configuration) await device.selectConfiguration(1);

    const iface = device.configuration?.interfaces?.[0];
    if (!iface) throw new Error("No USB interface available");

    await device.claimInterface(iface.interfaceNumber);
    const endpointOut = iface.alternates?.[0]?.endpoints?.find((e: any) => e.direction === "out");
    if (!endpointOut) throw new Error("No USB output endpoint available");

    return {
      id: `${device.vendorId ?? 0}:${device.productId ?? 0}`,
      name: String(device.productName ?? "USB Printer"),
      transport: "usb",
      write: async (bytes) => {
        await device.transferOut(endpointOut.endpointNumber, bytes);
      },
      close: async () => {
        try {
          await device.releaseInterface(iface.interfaceNumber);
        } finally {
          await device.close();
        }
      },
      reconnect: async () => create(),
    };
  };

  return create();
}

async function connectSerialPort(port: any, baudRate = 9600): Promise<PrinterConnection> {
  const create = async (): Promise<PrinterConnection> => {
    if (!port.readable || !port.writable) {
      await port.open({ baudRate });
    }

    return {
      id: "serial-port",
      name: "Serial Printer",
      transport: "serial",
      write: async (bytes) => {
        const writer = port.writable.getWriter();
        try {
          await writer.write(bytes);
        } finally {
          writer.releaseLock();
        }
      },
      close: async () => {
        await port.close();
      },
      reconnect: async () => create(),
    };
  };

  return create();
}

export async function requestPrinterConnection(transport: HardwareTransport): Promise<PrinterConnection> {
  const nav = navigator as any;

  if (transport === "bluetooth") {
    if (!nav.bluetooth?.requestDevice) throw new Error("Bluetooth API not available");
    const device = await nav.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [0x180f] });
    return connectBluetoothDevice(device);
  }

  if (transport === "usb") {
    if (!nav.usb?.requestDevice) throw new Error("USB API not available");
    const device = await nav.usb.requestDevice({ filters: [] });
    return connectUsbDevice(device);
  }

  if (transport === "serial") {
    if (!nav.serial?.requestPort) throw new Error("Serial API not available");
    const port = await nav.serial.requestPort();
    return connectSerialPort(port);
  }

  throw new Error("Network transport requires custom backend bridge");
}
