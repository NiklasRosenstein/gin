FROM debian:12-slim AS mise-base
RUN apt-get update  \
    && apt-get -y --no-install-recommends install sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
# ENV PATH="/mise/shims:$PATH"
ENV MISE_VERSION="v2025.6.0"
RUN curl https://mise.run | sh

FROM mise-base
WORKDIR /gin-argocd
COPY mise.toml /mise/mise.toml
RUN mise install
# We don't want to use Mise shims, otherwise a mise.toml in the Git repository used in the ArgoCD application
# might interfere.
RUN ln -vs $(mise which argocd) /usr/local/bin/argocd-cmp-server && \
    find /mise/installs -type f -executable -exec ln -vs {} /usr/local/bin/ \;
COPY entrypoint.ts ./

RUN groupadd --system --gid 999 argocd && \
    useradd --system --uid 999 --gid 999 --home /home/argocd -m --shell /bin/false argocd
USER argocd

WORKDIR /home/argocd/cmp-server/config/
COPY plugin.yaml ./
WORKDIR /home/argocd
VOLUME /home/argocd/cmp-server/plugins/
ENTRYPOINT [ "/usr/local/bin/argocd-cmp-server" ]
