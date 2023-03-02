import * as cdk from 'aws-cdk-lib'
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as cwlogs from 'aws-cdk-lib/aws-logs'

import { Construct } from 'constructs'

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction
  productsAdminHandler: lambdaNodeJS.NodejsFunction
  ordersHandler: lambdaNodeJS.NodejsFunction
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
    this.createProductsService(props, api)
    this.createOrdersService(props, api)
  }
  private createOrdersService(
    props: ECommerceApiStackProps,
    api: apigateway.RestApi
  ) {
    const ordersIntegration = new apigateway.LambdaIntegration(
      props.ordersHandler
    )

    //Resource -/orders
    const ordersResource = api.root.addResource('orders')

    //GET /orders
    //GET /orders?email=test@test
    //GET /orders?email=test@test&orderId=123
    //Posso ter um unico metodo nesse caso.
    ordersResource.addMethod('GET', ordersIntegration)
    //DELETE /orders?email=test@test&orderId=123
    const orderDeletionValidator = new apigateway.RequestValidator(
      this,
      'OrdersDeletionValidator',
      {
        restApi: api,
        requestValidatorName: 'OrderDeletionValidator',
        validateRequestParameters: true,
      }
    )
    //Validando no API Gateway as informacoes da URL
    ordersResource.addMethod('DELETE', ordersIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.orderId': true,
      },
      requestValidator: orderDeletionValidator,
    })

    //POST /orders
    ordersResource.addMethod('POST', ordersIntegration)
  }
  private createProductsService(
    props: ECommerceApiStackProps,
    api: apigateway.RestApi
  ) {
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
