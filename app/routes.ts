import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/novoservico', 'routes/servicos.tsx'),
    route('/novocliente', 'routes/clientes.tsx'),
    route('/veiculos', 'routes/veiculos.tsx'),

] satisfies RouteConfig;
