import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/servicos', 'routes/servicos.tsx'),
    route('/clientes', 'routes/clientes.tsx'),
    route('/veiculos', 'routes/veiculos.tsx'),

] satisfies RouteConfig;
