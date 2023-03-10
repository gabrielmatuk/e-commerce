#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ProductsAppStack } from '../lib/productsApp-stack'
import { ECommerceApiStack } from '../lib/ecommerceApi-stack'
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack'
import { EventsDbdStack } from '../lib/eventsDbd-stack'
import { OrdersAppLayersStack } from '../lib/ordersAppLayers-stack'
import { OrdersAppStack } from '../lib/ordersApp-stack'
import { InvoiceWSApiStack } from '../lib/invoiceWSApi-stack'
import { InvoicesAppLayersStack } from '../lib/invoicesAppLayers-stack'
import { AuditEventBusStack } from '../lib/auditEventBus-stack'
import { AuthLayersStack } from '../lib/authLayers-stack'

//Bin -> onde cria todas as stacks criadas na AWS vem dessa pasta
//As Stacks podem ter depedencias entre elas. O API Gateway recebe parametros do lambda entao, vamos subir primeiro o lambda.

const app = new cdk.App()
//Salvando o AccountId e a regiao utilizada
const env: cdk.Environment = {
  account: '708852634539',
  region: 'us-east-1',
}

//Vamos criar etiquetas para verificar as informacoes tambem de quem criou a tag
const tags = {
  cost: 'ECommerce',
  team: 'MatukGabriel',
}

const auditEventBus = new AuditEventBusStack(app, 'AuditEvents', {
  tags: {
    cost: 'Audit',
    team: 'MatukGabriel3',
  },
  env: env,
})

const authLayersStack = new AuthLayersStack(app, 'AuthLayers', {
  tags: tags,
  env: env,
})

const productsAppLayersStack = new ProductsAppLayersStack(
  app,
  'ProductsAppLayers',
  {
    tags: tags,
    env: env,
  }
)

const eventsDdbStack = new EventsDbdStack(app, 'EventsDdb', {
  tags: tags,
  env: env,
})

const productsAppStack = new ProductsAppStack(app, 'ProductsApp', {
  eventsDbd: eventsDdbStack.table,
  tags: tags,
  env: env,
})

//Inserindo uma depedencia, evitar algum problema.
productsAppStack.addDependency(productsAppLayersStack)
productsAppStack.addDependency(authLayersStack)
productsAppStack.addDependency(eventsDdbStack)

const ordersAppLayerStack = new OrdersAppLayersStack(app, 'OrdersAppLayers', {
  tags: tags,
  env: env,
})

const ordersAppStack = new OrdersAppStack(app, 'OrdersApp', {
  tags: tags,
  env: env,
  productsDdb: productsAppStack.productsDdb,
  eventsDbd: eventsDdbStack.table,
  auditBus: auditEventBus.bus,
})

ordersAppStack.addDependency(productsAppStack)
ordersAppStack.addDependency(ordersAppLayerStack)
ordersAppStack.addDependency(eventsDdbStack)
ordersAppStack.addDependency(auditEventBus)
//Nesse momento, estou passando o parametro das Lambdas para o meu API Gateway
const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: ordersAppStack.ordersHandler,
  orderEventsFetchHandler: ordersAppStack.orderEventsFetchHandler,
  tags: tags,
  env: env,
})

//Isso insere de forma mais explicita a depedencia de stacks
eCommerceApiStack.addDependency(productsAppStack)
eCommerceApiStack.addDependency(ordersAppStack)

const invoicesAppLayersStack = new InvoicesAppLayersStack(
  app,
  'InvoicesAppLayer',
  {
    tags: {
      cost: 'InvoiceApp',
      team: 'MatukGabriel2',
    },
    env: env,
  }
)

const invoiceWSApiStack = new InvoiceWSApiStack(app, 'InoivceApi', {
  eventsDdb: eventsDdbStack.table,
  auditBus: auditEventBus.bus,
  tags: {
    cost: 'InvoiceApp',
    team: 'MatukGabriel2',
  },
  env: env,
})

invoiceWSApiStack.addDependency(invoicesAppLayersStack)
invoiceWSApiStack.addDependency(eventsDdbStack)
invoiceWSApiStack.addDependency(auditEventBus)
