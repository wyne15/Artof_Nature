import { redirect } from "next/navigation";
import { isAdmin } from "@/server/adminAuth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Autentificare" };

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="adm-login">
      <div className="adm-card">
        <h1>Administrare</h1>
        <p className="sub2">Doar pentru proprietar. Emailul, parola și codul de 6 cifre din aplicația de autentificare.</p>
        <LoginForm />
        <p className="alt2c">Sesiunea se închide după 30 de minute de inactivitate. Pagina este ascunsă de motoarele de căutare.</p>
      </div>
    </div>
  );
}
