# @gin/sops

This package implements the `SecretProvider` API from the `@gin/core` package for a SOPS file. All values are returned
as `SecretValue` objects from the `@gin/core` package. This package wraps the `sops` command-line tool, so you need to
have it installed your system.

## Usage

```ts
import { SecretValue } from "@gin/core";
import { Sops } from "@gin/sops";
const sops = new Sops({ path: `${import.meta.dirname}/sops.yaml` });
const secretKey: SecretValue<string> = sops.getString("credentials.secretKey");
```

Your environment must be set up for the `sops` command to work and be able to decrypt the SOPS file. This typically
means setting up the necessary keys in your environment, such as `SOPS_AGE_KEY`. See https://getsops.io/ for more
information.

## Deno Permissions

| Permission         | Rationale                                                                        |
| ------------------ | -------------------------------------------------------------------------------- |
| `--allow-run=sops` | This package uses the `sops` command-line tool to read secrets from a SOPS file. |

## Extras

This package contains a `sops.schema.json` that can be added to your `.sops.yaml` files to enable schema validation in
your editor. For your convenience, it's available
