FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
ENV BACKEND_URL=http://backend:8080
ENV PORT=80
CMD ["sh", "-c", "NS=$(awk '/^nameserver/{ip=$2; if(ip ~ /:/){ip=\"[\"ip\"]\"}; print ip; exit}' /etc/resolv.conf) && sed -i \"s/1.1.1.1 8.8.8.8/$NS valid=10s/\" /etc/nginx/templates/default.conf.template && envsubst '${BACKEND_URL} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
