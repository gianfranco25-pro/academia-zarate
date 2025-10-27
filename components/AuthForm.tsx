"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          password,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Account created successfully. Please sign in.");
        router.push("/sign-in");
      } else {
        const { email, password } = data;
        console.log("[AuthForm] Iniciando sesión con:", email);

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        console.log("[AuthForm] Usuario autenticado:", userCredential.user.uid);

        const idToken = await userCredential.user.getIdToken();
        console.log("[AuthForm] idToken obtenido:", idToken ? "YES" : "NO");
        
        if (!idToken) {
          toast.error("Sign in Failed. Please try again.");
          return;
        }

        // Llama al endpoint para setear la cookie de sesión
        console.log("[AuthForm] Llamando a /api/auth/session...");
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "same-origin",
        });
        console.log("[AuthForm] Respuesta recibida:", res.status);
        
        const dataRes = await res.json();
        console.log("[AuthForm] Datos de respuesta:", dataRes);
        
        if (!dataRes.success) {
          toast.error("No se pudo crear la sesión. Intenta de nuevo.");
          return;
        }

        toast.success("Signed in successfully.");
        console.log("[AuthForm] Redirigiendo a /...");
        
        // Forzar recarga completa para que Next.js reconozca la nueva cookie
        window.location.href = "/";
      }
    } catch (error) {
      console.log(error);
      toast.error(`There was an error: ${error}`);
    }
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">Academia Zarate Consultas</h2>
        </div>

        <h3>
          "¡Bienvenido! Aquí podrás resolver tus dudas<br/>
          &nbsp;&nbsp;&nbsp;académicas de manera rápida y sencilla <br/>
          &nbsp;&nbsp;&nbsp;usando inteligencia artificial."
        </h3>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
            autoComplete="off"
          >
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Name"
                placeholder="Your Name"
                type="text"
              />
            )}

            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email address"
              type="email"
            />

            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
            />

            <Button className="btn" type="submit">
              {isSignIn ? "Iniciar sesión" : "Crear cuenta"}
            </Button>
          </form>
        </Form>

        <p className="text-center">
          {isSignIn ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-bold text-user-primary ml-1"
          >
            {!isSignIn ? "Iniciar sesión" : "Registrarse"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;