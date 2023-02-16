#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ProductsAppStack } from '../lib/productsApp-stack'
import { ECommerceApiStack } from '../lib/ecommerceApi-stack'

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

const productsAppStack = new ProductsAppStack(app, 'ProductsApp', {
  tags: tags,
  env: env,
})
//Nesse momento, estou passando o parametro das Lambdas para o meu API Gateway
const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  tags: tags,
  env: env,
})

//Isso insere de forma mais explicita a depedencia de stacks
eCommerceApiStack.addDependency(productsAppStack)
