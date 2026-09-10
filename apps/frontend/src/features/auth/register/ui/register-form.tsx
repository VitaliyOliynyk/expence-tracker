"use client";

import { useForm, type FieldPath } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { registerSchema, type RegisterInput } from "@expence/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { registerAction } from "../api/register-action";

export function RegisterForm() {
  const form = useForm<RegisterInput>({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await registerAction(values);
    if (!result) return;

    if (result.code === "CONFLICT") {
      form.setError("email", { message: result.error });
      return;
    }
    if (result.fields) {
      for (const [field, messages] of Object.entries(result.fields)) {
        form.setError(field as FieldPath<RegisterInput>, { message: messages[0] });
      }
      return;
    }
    form.setError("root", { message: result.error });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imie</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Haslo</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Zakladanie konta..." : "Zaloz konto"}
        </Button>
      </form>
    </Form>
  );
}
