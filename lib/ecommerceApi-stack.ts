import * as cdk from 'aws-cdk-lib'
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as cwlogs from 'aws-cdk-lib/aws-logs'

import { Construct } from 'constructs'

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction
}

export class ECommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props)

    const api = new apigateway.RestApi(this, 'ECommerceApi', {
      restApiName: 'ECommerceApi',
    })
    //Conectando a integracao do API Gateway com o nosso Lambda!
    const productsFetchIntegration = new apigateway.LambdaIntegration(
      props.productsFetchHandler
    )

    //criar o recurso de produttos -> o / tem sua representacao pelo root  /products
    const productsResource = api.root.addResource('products')
    //criando o metodo
    productsResource.addMethod('GET', productsFetchIntegration)
  }
}
