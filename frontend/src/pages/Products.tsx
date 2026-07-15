import { EntityCrudWorkspace } from "../components/app/EntityCrudWorkspace";

export default function ProductsPage() {
  return (
    <EntityCrudWorkspace
      config={{
        title: "Products",
        endpoint: "/products",
        queryKey: "products",
        permissionRead: "product.read",
        permissionManage: "product.manage",
        searchParam: "q",
        supportsRestore: true,
        exportPath: "/products/bulk-export",
        importPath: "/products/bulk-import",
        fields: [
          { key: "name", label: "Name", required: true },
          { key: "sku", label: "SKU" },
          { key: "barcode", label: "Barcode" },
          { key: "categoryId", label: "Category ID" },
          { key: "brandId", label: "Brand ID" },
          { key: "unitId", label: "Unit ID" },
          { key: "price", label: "Price", type: "number" },
          { key: "cost", label: "Cost", type: "number" },
        ],
        filters: [
          { key: "sku", label: "SKU", type: "text" },
          { key: "barcode", label: "Barcode", type: "text" },
          { key: "categoryId", label: "Category ID", type: "text" },
          { key: "brandId", label: "Brand ID", type: "text" },
          { key: "unitId", label: "Unit ID", type: "text" },
          { key: "minPrice", label: "Min Price", type: "number" },
          { key: "maxPrice", label: "Max Price", type: "number" },
          { key: "isActive", label: "Active Only", type: "boolean" },
        ],
      }}
    />
  );
}
