import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/settings', 'routes/settings.tsx'),
    route('/servicos', 'routes/servicos.tsx')
] satisfies RouteConfig;
