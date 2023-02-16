import * as lambda from 'aws-cdk-lib/aws-lambda'

import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'

import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'

import { Construct } from 'constructs'

export class ProductsAppStack extends cdk.Stack {
  readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
  readonly productsDdb: dynamodb.Table
  //scope = todo projeto do cdk. id = id propriamente dito do projeto. props = propriedades passadas para o CDK
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
      }
    )
  }
}
