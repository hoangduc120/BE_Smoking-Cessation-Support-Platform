const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { merge } = require('lodash');

// Đọc file swagger.yaml
const swaggerYaml = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Cấu hình JSDoc để đọc các routes từ các file JS
// const options = {
//   definition: {
//     openapi: '3.0.0',
//     info: {
//       title: 'Quit Smoking Support API',
//       version: '1.0.0',
//       description: 'API hỗ trợ kế hoạch cai nghiện thuốc lá',
//     },
//     servers: [
//       {
//         url: 'http://localhost:5000',
//         description: 'Development server',
//       },
//       {
//         url: 'https://be-smoking-cessation-support-platform.onrender.com',
//         description: 'Production server',
//       },
//     ],
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: 'http',
//           scheme: 'bearer',
//           bearerFormat: 'JWT',
//         },
//       },
//     },
//     security: [
//       {
//         bearerAuth: [],
//       },
//     ],
//   },
//   apis: ['./router/*.js'],
// };

// // Tạo swagger spec từ JSDoc annotations
// const swaggerJsDocSpec = swaggerJSDoc(options);

// Kết hợp cả hai nguồn
const combinedSpec = merge({}, swaggerYaml);

module.exports = {
  swaggerUi,
  swaggerSpec: combinedSpec,
};
