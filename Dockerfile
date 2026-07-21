FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG SOURCE_VERSION=dev
ENV SOURCE_VERSION=$SOURCE_VERSION

COPY package*.json ./
RUN npm ci

COPY . .
RUN echo "build ${SOURCE_VERSION}" && npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
