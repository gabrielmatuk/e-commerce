import * as cdk from 'aws-cdk-lib'
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as cwlogs from 'aws-cdk-lib/aws-logs'

import { Construct } from 'constructs'

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction
  productsAdminHandler: lambdaNodeJS.NodejsFunction
}

export class ECommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props)
    //Criando os Logs para visualizar o API Gateway
    const logGroup = new cwlogs.LogGroup(this, 'ECommerceApiLogs')
    const api = new apigateway.RestApi(this, 'ECommerceApi', {
      restApiName: 'ECommerceApi',
      cloudWatchRole: true,
      deployOptions: {
        //Inserindo onde o Cloudwatch vai criar o grupo de logs. Os logs sao para verificar quais informacoes acessam nossos lambdas
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        //Alterando o formato do log que vai aparecer no CloudWatch e atributos que vao aparecer no log
        //Esses logs vao cobrar sempre e alem de retornar dados sensiveis ip e usuario...
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
    })
    //Conectando a integracao do API Gateway com o nosso Lambda!
    const productsFetchIntegration = new apigateway.LambdaIntegration(
      props.productsFetchHandler
    )

    //criar o recurso de produttos -> o / tem sua representacao pelo root  /products
    const productsResource = api.root.addResource('products')
    //criando o metodo GET
    productsResource.addMethod('GET', productsFetchIntegration)

    // /products/{id} GET criando rota
    const productIdResource = productsResource.addResource('{id}')
    //Conectando a nota rota para o lambda
    productIdResource.addMethod('GET', productsFetchIntegration)

    //Novo recurso entrando no lambda que pode EDITAR a tabela
    const productsAdminIntegration = new apigateway.LambdaIntegration(
      props.productsAdminHandler
    )

    // /products POST
    productsResource.addMethod('POST', productsAdminIntegration)
    // /products/{id} PUT
    productIdResource.addMethod('PUT', productsAdminIntegration)
    // /products/{id} DELETE
    productIdResource.addMethod('DELETE', productsAdminIntegration)
  }
}
