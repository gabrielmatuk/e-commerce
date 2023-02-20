import * as lambda from 'aws-cdk-lib/aws-lambda'

import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'

import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import { Construct } from 'constructs'

interface ProductsAppStackProps extends cdk.StackProps {
  eventsDbd: dynamodb.Table
}

export class ProductsAppStack extends cdk.Stack {
  readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
  readonly productsAdminHandler: lambdaNodeJS.NodejsFunction
  readonly productsDdb: dynamodb.Table
  //scope = todo projeto do cdk. id = id propriamente dito do projeto. props = propriedades passadas para o CDK
  constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
    super(scope, id, props)
    //criando tabela no banco dynamo
    this.productsDdb = new dynamodb.Table(this, 'ProductsDbd', {
      tableName: 'products',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      //partitionKey sao os atributos obrigatorios para a criacao da tabela, seria minha primary key
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    })

    //Criando os Layer de produto
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'ProductsLayerVersionArn'
    )
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ProductsLayerVersionArn',
      productsLayerArn
    )
    //Criando funcao que sera chamada em outro lambda
    const productEventsHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'ProductsEventsFunction',
      {
        functionName: 'ProductsEventsFunction',
        entry: 'lambda/products/ProductsEventsFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          //como vamos empacotar o arquivo e subir na AWS.
          minify: true,
          sourceMap: false,
        },
        environment: {
          EVENTS_DDB: props.eventsDbd.tableName,
        },
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )

    //configurando como sera minha funcao lambda
    this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'ProductsFetchFunction',
      {
        functionName: 'ProductsFetchFunction',
        entry: 'lambda/products/productsFetchFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          //como vamos empacotar o arquivo e subir na AWS.
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
        },
        layers: [productsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )
    //Liberando permissao de leitura do Lambda -> Tabela products.
    this.productsDdb.grantReadData(this.productsFetchHandler)

    //Criando lambda de admnistracao para tabela do Dynamo
    this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'ProductsAdminFunction',
      {
        functionName: 'ProductsAdminFunction',
        entry: 'lambda/products/productsAdminFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          //como vamos empacotar o arquivo e subir na AWS.
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
        },
        layers: [productsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )

    this.productsDdb.grantWriteData(this.productsAdminHandler)
  }
}
