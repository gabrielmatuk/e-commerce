#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ProductsAppStack } from '../lib/productsApp-stack'
import { ECommerceApiStack } from '../lib/ecommerceApi-stack'
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack'
import { EventsDbdStack } from '../lib/eventsDbd-stack'
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
productsAppStack.addDependency(eventsDdbStack)

//Nesse momento, estou passando o parametro das Lambdas para o meu API Gateway
const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  tags: tags,
  env: env,
})

//Isso insere de forma mais explicita a depedencia de stacks
eCommerceApiStack.addDependency(productsAppStack)
