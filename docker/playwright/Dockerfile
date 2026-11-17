FROM node:22-bookworm

WORKDIR /workspace

# Outside root's home, so the browsers stay readable when the container runs
# as the host user
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package-lock.json ./
COPY docker/playwright/get-playwright-version.sh ./

RUN npx --yes "playwright@$(sh get-playwright-version.sh)" install --with-deps chromium firefox
