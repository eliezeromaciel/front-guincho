import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/clientes', 'routes/clientes.tsx'),
    route('/settings', 'routes/settings.tsx'),
    route('/financeiro', 'routes/testeparams.tsx')
] satisfies RouteConfig;
