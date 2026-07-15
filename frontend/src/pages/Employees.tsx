import { GenericCrudPage } from "../components/app/GenericCrudPage";
import { crudModules } from "../components/app/moduleConfig";

export default function EmployeesPage() {
  return <GenericCrudPage config={crudModules.employees} />;
}
