# LoveProject

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Connecting to the backend API

The app now consume el backend Express (`love-api`). Configura la URL base mediante la variable de entorno `NG_APP_API_URL`.

1. Crea un archivo `.env` en la raíz del proyecto (o exporta la variable en tu shell) con:

   ```env
   NG_APP_API_URL=http://localhost:1/api
   ```

   Ajusta el puerto/host si tu API corre en otro lugar.

2. Inicia el backend (`npm run dev` dentro de `love-api`).
3. Levanta el frontend con `ng serve`. Angular cargará la variable `NG_APP_API_URL` al arrancar.

El flujo de login ahora llama a `POST /auth/login` y todas las cartas/fotos se obtienen desde la API.

- Para entrar usa tu correo o usuario junto con la contraseña configurada en el backend.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
