FROM debian:12-slim AS mise-base
RUN apt-get update  \
    && apt-get -y --no-install-recommends install sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"
ENV MISE_VERSION="v2025.6.0"
RUN curl https://mise.run | sh

FROM mise-base
WORKDIR /gin-argocd
COPY mise.toml /mise/mise.toml
RUN mise install
RUN ln -s $(mise which argocd) /mise/shims/argocd-cmp-server
COPY entrypoint.ts ./

WORKDIR /home/argocd/cmp-server/config/
COPY plugin.yaml ./
WORKDIR /home/argocd
VOLUME /home/argocd/cmp-server/plugins/
ENTRYPOINT [ "/mise/shims/argocd-cmp-server" ]
