import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route('/login', 'routes/login.tsx'),
    route('/logout', 'routes/logout.tsx'),
    route('/novoservico', 'routes/servicos.tsx'),
    route('/novocliente', 'routes/clientes.tsx'),
    route('/veiculos', 'routes/veiculos.tsx'),
    route('/manutencao', 'routes/planejamento.jsx'),
    route('/api/notificar', 'routes/api.notificar.ts'),
    route('/api/registrar-subscription', 'routes/api.registrar-subscription.ts'),
] satisfies RouteConfig;
