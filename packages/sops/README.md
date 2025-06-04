This package provides a `SecretProvider` implementation for SOPS files, using the `@gin/core` API. All secrets are
returned as `SecretValue` objects from `@gin/core`. It relies on the `sops` command-line tool, which must be installed
on your system.

## Usage

```ts
import { SecretValue } from "@gin/core";
import { Sops } from "@gin/sops";
const sops = new Sops({ path: `${import.meta.dirname}/sops.yaml` });
const secretKey: SecretValue<string> = await sops.getString("credentials.secretKey");
```

Ensure your environment is configured so the `sops` command can decrypt your SOPS file. This usually involves setting up
the appropriate keys, such as `SOPS_AGE_KEY`. For more details, see the [SOPS documentation](https://getsops.io/).

## Deno Permissions

| Permission         | Reason                                                                            |
| ------------------ | --------------------------------------------------------------------------------- |
| `--allow-run=sops` | Required to invoke the `sops` CLI for reading secrets from a SOPS-encrypted file. |
