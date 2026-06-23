# DOCKER & CI/CD

This repo is my playground for learning [Docker](https://www.docker.com) and [GitHub Actions CI/CD](https://github.com/features/actions).

A few weeks ago I had this itch: I wanted to build *real* software. The kind you can `TRUST`, deploy to production, ship with other developers, and be as little error-prone as possible.

After a bit of digging I figured out the two skills I was missing: `Docker` to kill the famous *"it worked on my machine"* problem, and `CI/CD` (continuous integration / continuous delivery) to make sure the code works and meets the standards *before* I push or merge.

> [!IMPORTANT]
> This repo does NOT aim for the best code practices. It focuses on Docker and CI/CD practices, so expect some "good enough" code along the way.

## What is Docker

Docker lets you run your application inside an isolated environment called a **container**. That container ships with everything the software needs: the code, the runtime, the dependencies, the right versions of all of the above.

So if I build an app with `node:22` and I want to share it with another dev, they don't need to have Node 22 installed. They just run the container. And if I want to deploy it to a server that has *no* Node at all? Same answer: *"just run the container"*.

### Dockerfile

A `Dockerfile` is just a set of instructions Docker will execute to build that container. You write things like `FROM`, `CMD`, `COPY`, `RUN`, `WORKDIR`, and a few more.

> [!TIP]
> Let's use the actual Dockerfile as example

```dockerfile
FROM node:22 # which docker image to use as a base

RUN mkdir -p /home/app
# RUN runs a shell command, here we just create the home dir

COPY . /home/app
# COPY copies stuff from a local folder into the container

EXPOSE 3000
# EXPOSE tells Docker the container listens on this port

CMD ["node", "/home/app/index.js"]
# CMD is the default thing the container runs when it starts
```

*This was my first Dockerfile after reading docs and watching tutorials.*

It works, but it's not great for production. We're copying **everything** from the root folder into the container, including stuff that has no business being there, like the `.git` folder. And imagine a dev clones the repo, forgets to run `npm install`, and tries to run the container without a `node_modules` folder. Boom, it crashes.

Two upgrades fix that: a `.dockerignore` to keep junk out, and running `pnpm install` *inside* the container so dependencies are always there.

`.dockerignore`

```gitignore
# ignore node_modules, we install it inside the container
node_modules

# ignore git files
.git
.gitignore

# ignore docker files (we don't need them inside the image)
Dockerfile*
.dockerignore
```

`Dockerfile`

```dockerfile
FROM node:22

RUN npm install -g corepack@latest
RUN corepack enable pnpm

WORKDIR /home/app
COPY . .

RUN pnpm install

EXPOSE 3000
CMD ["node", "index.js"]
```

## Docker Compose — dev vs prod

Having one Dockerfile is fine, but as soon as you add a database you quickly want more than one process running. That's where Compose comes in. I ended up with two files on purpose: one for development, one for production. They look similar but they answer different questions.

`docker-compose-dev.yml` (what I use while I'm coding)

```yaml
services:
  db:
    image: mongo
    restart: unless-stopped
    ports:
      - 27017:27017   # exposed so I can hit mongo from my host
    env_file:
      - .env
    volumes:
      - mongo-data:/data/db

  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    restart: unless-stopped
    ports:
      - "3000:3000"
    links:
      - db
    volumes:
      - .:/home/app     # bind mount: my host code IS the container code

volumes:
  mongo-data:
```

`docker-compose.yml` (the production one)

```yaml
services:
  db:
    image: mongo
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - mongo-data:/data/db
    # no ports, the DB is NOT exposed to the host. only the backend talks to it.

  backend:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    links:
      - db

volumes:
  mongo-data:
```

A few things worth calling out:

- The **dev** compose exposes Mongo on `27017` and bind-mounts the source code into the container. That way I can edit a file on my laptop, the container picks it up (via `tsx watch`), and there's no rebuild dance.
- The **prod** compose does *not* expose Mongo at all. There's literally no reason for the outside world to talk to the database directly — the backend is the only one who needs it. That single line you delete (or just don't write) is a real security upgrade.
- Both use `env_file: - .env` so the same `.env` file feeds the credentials into the services.

## Env vars with dotenv

Speaking of `.env`: I'm using [dotenv](https://github.com/motdotla/dotenv) to load env vars at startup. The example app has two: `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD`, and the connection string is built from them.

```ts
dotenv.config();

const DB_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME ?? "";
const DB_PWD = process.env.MONGO_INITDB_ROOT_PASSWORD ?? "";

const DB_URL = `mongodb://${DB_USERNAME}:${DB_PWD}@db:27017/backend?authSource=admin`;
void mongoose.connect(DB_URL);
```

Notice the `db:` hostname. Inside Compose, the service name (`db`) is the DNS name, so the backend reaches Mongo at `mongodb://db:27017`.

## Moving to TypeScript

At some point I ported the whole thing from JavaScript to TypeScript. 
The migration break the Dockerfiles. They used to end with `CMD ["node", "index.js"]`. After the move, there's a build step in between:

```dockerfile
FROM node:22

RUN npm install -g corepack@latest
RUN corepack enable pnpm

WORKDIR /home/app
COPY . .

RUN pnpm install
RUN pnpm build        # <-- tsc compiles src/ into dist/

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Two takeaways from that:

- The image now ships `dist/`, which is the *compiled* JS. Source maps and `.ts` files stay out of the image. The container doesn't need a TypeScript compiler at runtime.
- The dev Dockerfile (the one with hot-reload) doesn't build at all. It just runs `tsx watch src/index.ts` directly, because in dev you *want* TypeScript running live.

## Linting with ESLint

Adding a linter feels like overkill when the codebase is three files, but the whole point of this repo is "things should be enforced by tooling, not by me remembering". So ESLint came in early.

I'm using `typescript-eslint` with the `strict-type-checked` and `stylistic-type-checked` configs. The first one yells at you for unsafe types. The second one keeps the formatting consistent. Together they're annoying for about a week, and then you can't live without them.

```js
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "*.config.*"] },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.test.json'],
      },
    },
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
);
```

There's a small note in there worth pointing at: in `tests/**/*.ts` I'm turning off the `no-unsafe-*` rules. Why? Because in tests you do a lot of dynamic, "I don't care about types right now, just give me the response" stuff. Letting the linter be strict there is just noise. Production code stays strict.

## Testing with Jest

Tests are the other half of the "TRUST" thing. The first test I wrote is hilariously basic and I love it:

```ts
// src/lib/sum.ts
export function sum(a: number, b: number): number {
  return a + b;
}
```

```ts
// tests/lib/sum.test.ts
import { sum } from "../../src/lib/sum.ts";

describe("Sum function", () => {
  it("should sum two numbers", () => {
    const res = sum(10, 30);

    expect(res).toEqual(40);
  });
});
```

Yeah, it's testing `1 + 1`. But the point isn't `sum`, the point is that **Jest + ts-jest + ESM is wired up correctly**, that the pipeline can run TypeScript tests, and that the next real test I write will just work.

The config is worth a peek because the `ts-jest + ESM` combo is famously fiddly:

```js
// jest.config.cjs
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.m?tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json', useESM: true }],
  },
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
};
```

Two things saved me a couple of hours here:

- `extensionsToTreatAsEsm: ['.ts']` — without this, Node treats your `.ts` files as CommonJS and you get cryptic import errors.
- The `moduleNameMapper` with `\.js$ -> $1` — this is the "I import `./foo.js` but the source file is `./foo.ts`" trick. Required when you're using NodeNext module resolution with TypeScript.

## CI/CD with GitHub Actions

This is the part I cared about most. Up to this point, all of the above lived on my machine. "Works on my laptop" was still the rule. CI is what turns this into a system other people can rely on.

The workflow is at `.github/workflows/test_and_build.yml` and it's pretty short:

```yaml
name: "Test and Build"

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

permissions:
  contents: read
  packages: write

jobs:
  test_and_build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [22.x]

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11.5.2

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Check linting
        run: pnpm lint

      - name: Run tests
        run: pnpm test

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v7
        with:
          push: true
          platforms: linux/amd64,linux/arm64
          tags: ghcr.io/benjaaguilar/docker-cicd:latest
```

A few things going on:

- It runs on **every push and every PR** to `main`. That's the whole point: nothing reaches main unverified.
- The `matrix` has just one Node version right now. The point isn't to test against 6 versions, it's to show the pattern. Adding `20.x`, `24.x` later is a one-line change.
- `cache: 'pnpm'` is the single biggest time-saver. The first run downloads dependencies, every run after that uses the cache.
- The pipeline is linear: **install → lint → test → build & push**. If any of the first three fail, the build never happens. The image only ships if the code is clean.
- `permissions: packages: write` is the only "elevated" permission requested, and it's needed for the GHCR push. `contents: read` is the safe default. No `id-token: write`, no `actions: write`. The principle: ask for the least you can.
- The last step builds a **multi-arch** image (`linux/amd64,linux/arm64`) and pushes it to GHCR. The `arm64` part is the one I care about the most, because I run a Raspberry Pi at home. With this, `docker pull ghcr.io/benjaaguilar/docker-cicd:latest` works on my laptop *and* on the Pi, no second tag, no separate pipeline. QEMU + Buildx is what makes that magic happen — QEMU emulates the foreign architecture, Buildx orchestrates the whole thing.

### The "Proof of Failure" (POF) trick

One thing I do to check the pipeline is the **POF**: I intentionally break the code to make sure the pipeline actually catches it.

I did it twice in this repo, on purpose:

1. **For tests.** I edited `sum.ts` to return the wrong value, pushed it, watched CI go red with the failing test, then fixed it and pushed again. If the workflow goes green with a broken `sum`, the test setup is broken — the POF proves it's *not*.
2. **For linting.** I added an unused import to `sum.ts`, pushed it, and watched the lint step fail with a `no-unused-vars` error. Same idea: if lint stays green with an unused import, the lint config is broken.

It feels silly to merge a commit that says *"add unused import"* or *"introduce a bug"*, but the commit right after says *"fix it"*. Both stay in the history as receipts. If somebody later changes the pipeline in a way that disables a check, the POF commits are still there to remind you: no, that check has teeth, here's the proof.

## The app

Just so the whole thing isn't a Docker pipeline wrapped around a `console.log("hello")`, there's a tiny Express + Mongoose app in `src/index.ts`. It has one model and two routes.

```ts
const Mate = mongoose.model(
  "Mate",
  new mongoose.Schema({
    name: String,
    price: Number,
  }),
);
```

```ts
app.get("/", async (_req: Req, res: Res) => {
  const mates = await Mate.find();
  res.json({ success: true, message: "welcome to my app", mates });
});

app.get("/add", async (_req: Req, res: Res) => {
  await Mate.create({ name: "porongo", price: 10 });
  res.json({ success: true, message: "Mate created" });
});
```

Yeah, `/add` doesn't take a body. Yes, hardcoding `name: "porongo"` is bad. Yes, there's no validation, no auth, no schema discipline. The point of the app is to be a *thing that runs in the container and exercises CI/CD*. Mission accomplished.

## What I learned

A few things clicked for me during this whole thing:

- **Docker is a packaging story first, a deployment story second.** The same image that runs on my laptop runs on the Pi, runs on a VPS, runs in GHCR. That portability is what makes the *"works on my machine"* problem go away.
- **Compose lets you encode your environment.** Once `docker-compose-dev.yml` is correct, onboarding a new dev is one `docker compose up`. No *"did you install Mongo? what version? which port?"*.
- **CI is more about what it forbids than what it runs.** The whole point isn't running the tests — I can run the tests on my machine. The point is that *I can't merge a PR if the tests don't pass*. That shift, from "I should run the tests" to "I literally can't not run the tests", is the actual win.
- **The POF is non-negotiable.** A check that has never failed is a check that might not be working. Break the code on purpose, watch CI catch it, fix it. Then you trust the pipeline.

That's the repo. It's small, it's a little ugly in places, and it shipped.
