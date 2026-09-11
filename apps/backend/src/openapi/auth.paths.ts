import {
  apiErrorSchema,
  authResponseSchema,
  loginSchema,
  registerSchema,
  userDtoSchema,
} from "@expence/types";
import type { AuthResponse, LoginInput, RegisterInput, UserDto } from "@expence/types";
import type { ZodOpenApiPathsObject, ZodOpenApiResponseObject } from "zod-openapi";
import {
  badRequestResponse,
  malformedJsonExample,
  unauthorizedResponse,
  unhandledErrorResponse,
} from "./responses";

/**
 * Opis endpointow modulu auth: `/api/auth/register`, `/api/auth/login` i `/api/auth/me`.
 * Statusy odpowiadaja temu, co faktycznie zwracaja route handlery w `src/app/api/auth` -
 * zmiana handlera wymaga zmiany tutaj.
 */

export const AUTH_TAG = "auth";

/*
 * Przyklady dla Swagger UI. Logowanie podpowiada konto z seeda, zeby "Try it out"
 * od razu zwrocilo token do wklejenia w "Authorize".
 */

const exampleUser = {
  id: "01a08d61-6e9a-7c31-a2f4-2b8c5d7e9f10",
  name: "Dev User",
  email: "dev@expence.local",
  image: null,
  createdAt: "2026-09-01T08:00:00.000Z",
} satisfies UserDto;

const exampleAuthResponse = {
  user: exampleUser,
  token:
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMWEwOGQ2MS02ZTlhLTdjMzEtYTJmNC0yYjhjNWQ3ZTlmMTAifQ.sygnatura",
  expiresAt: 1789032600000,
} satisfies AuthResponse;

const exampleLoginBody = {
  email: "dev@expence.local",
  password: "dev12345",
} satisfies LoginInput;

const exampleRegisterBody = {
  name: "Jan",
  email: "jan@example.com",
  password: "tajnehaslo",
} satisfies RegisterInput;

/** Przyklad bledu walidacji body rejestracji - komunikat z `passwordSchema`. */
const invalidRegisterBodyExample = {
  summary: "Bledy walidacji body",
  value: {
    error: {
      code: "BAD_REQUEST",
      message: "Nieprawidlowe dane wejsciowe",
      fields: { password: ["Haslo musi miec co najmniej 8 znakow"] },
    },
  },
};

/** Przyklad bledu walidacji body logowania - komunikat z `loginSchema`. */
const invalidLoginBodyExample = {
  summary: "Bledy walidacji body",
  value: {
    error: {
      code: "BAD_REQUEST",
      message: "Nieprawidlowe dane wejsciowe",
      fields: { email: ["Nieprawidlowy adres e-mail"] },
    },
  },
};

/** 404 z `/api/auth/me` - token jest wazny, ale konta juz nie ma. */
const userNotFoundResponse: ZodOpenApiResponseObject = {
  description: "Token jest wazny, ale konta nie ma (usuniete po wystawieniu tokenu)",
  content: {
    "application/json": {
      schema: apiErrorSchema,
      example: { error: { code: "NOT_FOUND", message: "Nie znaleziono uzytkownika" } },
    },
  },
};

/** Opis pola `expiresAt` powtarzany w obu odpowiedziach z tokenem. */
const tokenDescription =
  "`token` to JWT HS256 (`sub` = id uzytkownika) wazny 10 minut; `expiresAt` to chwila " +
  "wygasniecia w milisekundach od epoki Unix.";

export const authPaths: ZodOpenApiPathsObject = {
  "/api/auth/register": {
    post: {
      tags: [AUTH_TAG],
      operationId: "register",
      summary: "Rejestracja konta",
      description:
        "Zaklada konto i od razu zwraca token dostepu. E-mail jest przycinany i zamieniany " +
        `na male litery przed zapisem. ${tokenDescription}`,
      // Endpoint publiczny (PUBLIC_PATHS w proxy.ts) - nadpisuje globalne bearerAuth.
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: registerSchema, example: exampleRegisterBody },
        },
      },
      responses: {
        "201": {
          description: "Utworzone konto i token dostepu",
          content: {
            "application/json": { schema: authResponseSchema, example: exampleAuthResponse },
          },
        },
        "400": badRequestResponse({
          invalidBody: invalidRegisterBodyExample,
          malformedJson: malformedJsonExample,
        }),
        "409": {
          description: "Konto z tym adresem e-mail juz istnieje",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: { error: { code: "CONFLICT", message: "Konto z tym adresem juz istnieje" } },
            },
          },
        },
        "500": {
          description: "Nieoczekiwany blad rejestracji (logowany przez console.error)",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: { error: { code: "INTERNAL", message: "Nie udalo sie zarejestrowac" } },
            },
          },
        },
      },
    },
  },
  "/api/auth/login": {
    post: {
      tags: [AUTH_TAG],
      operationId: "login",
      summary: "Logowanie",
      description:
        "Sprawdza e-mail i haslo, zwraca token dostepu do naglowka `Authorization: Bearer`. " +
        `Token wklej w "Authorize", zeby wywolywac chronione endpointy. ${tokenDescription}`,
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: loginSchema, example: exampleLoginBody },
        },
      },
      responses: {
        "200": {
          description: "Zalogowany uzytkownik i token dostepu",
          content: {
            "application/json": { schema: authResponseSchema, example: exampleAuthResponse },
          },
        },
        "400": badRequestResponse({
          invalidBody: invalidLoginBodyExample,
          malformedJson: malformedJsonExample,
        }),
        "401": {
          description:
            "Zly e-mail albo haslo - celowo ten sam komunikat, zeby nie zdradzac, " +
            "ktore adresy sa zarejestrowane",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: {
                error: { code: "UNAUTHORIZED", message: "Nieprawidlowy e-mail lub haslo" },
              },
            },
          },
        },
        "403": {
          description: "Konto istnieje, ale jest nieaktywne",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: { error: { code: "FORBIDDEN", message: "Konto jest nieaktywne" } },
            },
          },
        },
        "500": {
          description: "Nieoczekiwany blad logowania (logowany przez console.error)",
          content: {
            "application/json": {
              schema: apiErrorSchema,
              example: { error: { code: "INTERNAL", message: "Nie udalo sie zalogowac" } },
            },
          },
        },
      },
    },
  },
  "/api/auth/me": {
    get: {
      tags: [AUTH_TAG],
      operationId: "getCurrentUser",
      summary: "Profil zalogowanego uzytkownika",
      description: "Uzytkownik wskazany przez `sub` tokenu dostepu.",
      responses: {
        "200": {
          description: "Profil uzytkownika",
          content: { "application/json": { schema: userDtoSchema, example: exampleUser } },
        },
        "401": unauthorizedResponse,
        "404": userNotFoundResponse,
        "500": unhandledErrorResponse,
      },
    },
  },
};
