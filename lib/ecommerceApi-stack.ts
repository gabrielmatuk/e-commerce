import * as cdk from 'aws-cdk-lib'
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as cwlogs from 'aws-cdk-lib/aws-logs'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as lambda from 'aws-cdk-lib/aws-lambda'

import { Construct } from 'constructs'

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction
  productsAdminHandler: lambdaNodeJS.NodejsFunction
  ordersHandler: lambdaNodeJS.NodejsFunction
  orderEventsFetchHandler: lambdaNodeJS.NodejsFunction
}

export class ECommerceApiStack extends cdk.Stack {
  private productsAuthorizer: apigateway.CognitoUserPoolsAuthorizer
  private customerPool: cognito.UserPool
  private adminPool: cognito.UserPool

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
    this.createCognitoAuth()
    //Conectando a integracao do API Gateway com o nosso Lambda!
    this.createProductsService(props, api)
    this.createOrdersService(props, api)
  }

  private createCognitoAuth() {
    const postConfirmationHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'PostConfirmationFunction',
      {
        functionName: 'PostConfirmationFunction',
        entry: 'lambda/auth/postConfirmationFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          //como vamos empacotar o arquivo e subir na AWS.
          minify: true,
          sourceMap: false,
        },
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )

    const preAuthenticationHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'PreAuthenticationFunction',
      {
        functionName: 'PreAuthenticationFunction',
        entry: 'lambda/auth/preAuthenticationFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          //como vamos empacotar o arquivo e subir na AWS.
          minify: true,
          sourceMap: false,
        },
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )

    //Cognito customer UserPool
    this.customerPool = new cognito.UserPool(this, 'CustomerPool', {
      lambdaTriggers: {
        preAuthentication: preAuthenticationHandler,
        postConfirmation: postConfirmationHandler,
      },
      userPoolName: 'CustomerPool',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
        phone: false,
      },
      userVerification: {
        emailSubject: 'Verify your email for the ECommerce service!',
        emailBody:
          'Thanks for signing for up to ECommerce service! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      signInAliases: {
        username: false,
        email: true,
      },
      standardAttributes: {
        fullname: {
          required: true,
          mutable: false,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    })

    //Cognito admin UserPool
    this.adminPool = new cognito.UserPool(this, 'AdminPool', {
      userPoolName: 'AdminPool',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      userInvitation: {
        emailSubject: 'Welcome to ECommerce administrator service',
        emailBody:
          'Your username is {username} and temporary password is {####}',
      },
      signInAliases: {
        username: false,
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    })

    this.adminPool.addDomain('AdminDomain', {
      cognitoDomain: {
        domainPrefix: 'gpm-admin-service',
      },
    })

    this.customerPool.addDomain('CustomerDomain', {
      cognitoDomain: {
        domainPrefix: 'gpm-customer-service',
      },
    })

    const customerWebScope = new cognito.ResourceServerScope({
      scopeName: 'web',
      scopeDescription: 'Customer Web operation',
    })

    const customerMobileScope = new cognito.ResourceServerScope({
      scopeName: 'mobile',
      scopeDescription: 'Customer Mobile operation',
    })

    const adminWebScope = new cognito.ResourceServerScope({
      scopeName: 'web',
      scopeDescription: 'Admin Web operation',
    })

    const customerResourceServer = this.customerPool.addResourceServer(
      'CustomerResourceServer',
      {
        identifier: 'customer',
        userPoolResourceServerName: 'CustomerResourceServer',
        scopes: [customerMobileScope, customerWebScope],
      }
    )

    const adminResourceServer = this.adminPool.addResourceServer(
      'AdminResourceServer',
      {
        identifier: 'admin',
        userPoolResourceServerName: 'AdminResourceServer',
        scopes: [adminWebScope],
      }
    )

    this.customerPool.addClient('customer-web-client', {
      userPoolClientName: 'customerWebClient',
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(7),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(
            customerResourceServer,
            customerWebScope
          ),
        ],
      },
    })

    this.customerPool.addClient('customer-mobile-client', {
      userPoolClientName: 'customerMobileClient',
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(7),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(
            customerResourceServer,
            customerMobileScope
          ),
        ],
      },
    })

    this.adminPool.addClient('admin-web-client', {
      userPoolClientName: 'adminWebClient',
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(7),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(adminResourceServer, adminWebScope),
        ],
      },
    })

    this.productsAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'ProductsAuthorizer',
      {
        authorizerName: 'ProductsAuthorizer',
        cognitoUserPools: [this.customerPool],
      }
    )
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
    const orderRequestValidator = new apigateway.RequestValidator(
      this,
      'OrderRequestValidator',
      {
        restApi: api,
        requestValidatorName: 'Order request validator',
        validateRequestBody: true,
      }
    )
    //Criando um modelo para o API Gateway verificar a requisicao
    const orderModel = new apigateway.Model(this, 'OrderModel', {
      modelName: 'OrderModel',
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: {
            type: apigateway.JsonSchemaType.STRING,
          },
          productIds: {
            type: apigateway.JsonSchemaType.ARRAY,
            minItems: 1,
            items: {
              type: apigateway.JsonSchemaType.STRING,
            },
          },
          payment: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['CASH', 'DEBIT_CARD', 'CREDIT_CARD'],
          },
        },
        required: ['email', 'productIds', 'payment'],
      },
    })
    ordersResource.addMethod('POST', ordersIntegration, {
      requestValidator: orderRequestValidator,
      requestModels: {
        'application/json': orderModel,
      },
    })
    // /orders/events
    const orderEventsResource = ordersResource.addResource('events')

    const orderEventsFetchValidator = new apigateway.RequestValidator(
      this,
      'OrderEventsFetchValidator',
      {
        restApi: api,
        requestValidatorName: 'OrderEventsFetchValidator',
        validateRequestParameters: true,
      }
    )

    const orderEventsFunctionIntegration = new apigateway.LambdaIntegration(
      props.orderEventsFetchHandler
    )
    //GET /orders/events?email=test@test.com.br

    //GET /orders/events?email=test@test.com.br&eventType=ORDER_CREATED
    orderEventsResource.addMethod('GET', orderEventsFunctionIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.eventType': false,
      },
      requestValidator: orderEventsFetchValidator,
    })
  }
  private createProductsService(
    props: ECommerceApiStackProps,
    api: apigateway.RestApi
  ) {
    const productsFetchIntegration = new apigateway.LambdaIntegration(
      props.productsFetchHandler
    )

    const productsFetchWebMobileIntegrationOption = {
      authorizer: this.productsAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['customer/web', 'customer/mobile'],
    }

    const productsFetchWebIntegrationOption = {
      authorizer: this.productsAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['customer/web'],
    }
    //criar o recurso de produttos -> o / tem sua representacao pelo root  /products
    const productsResource = api.root.addResource('products')
    //criando o metodo GET /products
    productsResource.addMethod(
      'GET',
      productsFetchIntegration,
      productsFetchWebMobileIntegrationOption
    )

    // /products/{id} GET criando rota
    const productIdResource = productsResource.addResource('{id}')
    //Conectando a nota rota para o lambda
    productIdResource.addMethod(
      'GET',
      productsFetchIntegration,
      productsFetchWebIntegrationOption
    )

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
