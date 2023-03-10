import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as lambdaEventSource from 'aws-cdk-lib/aws-lambda-event-sources'
import * as event from 'aws-cdk-lib/aws-events'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as cw from 'aws-cdk-lib/aws-cloudwatch'
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions'

import { Construct } from 'constructs'

interface OrdersAppStackProps extends cdk.StackProps {
  productsDdb: dynamodb.Table
  eventsDbd: dynamodb.Table
  auditBus: event.EventBus
}

export class OrdersAppStack extends cdk.Stack {
  readonly ordersHandler: lambdaNodeJS.NodejsFunction
  readonly orderEventsFetchHandler: lambdaNodeJS.NodejsFunction

  constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props)

    const ordersDdb = new dynamodb.Table(this, 'OrdersDdb', {
      tableName: 'orders',
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    })
    const writeThrottleEventsMetric = ordersDdb.metric('WriteThrottleEvents', {
      period: cdk.Duration.minutes(2),
      statistic: 'SampleCount',
      unit: cw.Unit.COUNT,
    })
    writeThrottleEventsMetric.createAlarm(this, 'WriteThrottleEventsAlarm', {
      alarmName: 'WriteThrottleEvents',
      actionsEnabled: false,
      evaluationPeriods: 1,
      threshold: 10,
      comparisonOperator:
        cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cw.TreatMissingData.NOT_BREACHING,
    })
    //Orders Layer
    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'OrdersLayerVersionArn'
    )
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrdersLayerVersionArn',
      ordersLayerArn
    )

    //Orders Api Layer

    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'OrdersApiLayerVersionArn'
    )
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrdersApiLayerVersionArn',
      ordersApiLayerArn
    )

    //Orders Events Layer

    const ordersEventsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'OrdersEventsLayerVersionArn'
    )
    const ordersEventsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrdersEventsLayerVersionArn',
      ordersEventsLayerArn
    )

    //Order Repository Events Layer
    const ordersEventsRepositoryLayerArn =
      ssm.StringParameter.valueForStringParameter(
        this,
        'OrdersEventsRepositoryLayerVersionArn'
      )
    const ordersEventsRepositoryLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OrdersEventsRepositoryLayerVersionArn',
      ordersEventsRepositoryLayerArn
    )
    //Products Layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'ProductsLayerVersionArn'
    )
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ProductsLayerVersionArn',
      productsLayerArn
    )

    //auth layer
    const authUserInfoLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      'AuthUserInfoLayerVersionArn'
    )

    const authUserInfoLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'AuthUserInfoLayerVersionArn',
      authUserInfoLayerArn
    )
    //Criando SNS
    const ordersTopic = new sns.Topic(this, 'OrderEventsTopic', {
      displayName: 'Order events topic',
      topicName: 'order-events',
    })

    this.ordersHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'OrdersFunction',
      {
        functionName: 'OrdersFunction',
        entry: 'lambda/orders/ordersFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          //como vamos empacotar o arquivo e subir na AWS.
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DDB: props.productsDdb.tableName,
          ORDERS_DDB: ordersDdb.tableName,
          ORDER_EVENTS_TOPIC_ARN: ordersTopic.topicArn,
          AUDIT_BUS_NAME: props.auditBus.eventBusName,
        },
        layers: [
          ordersLayer,
          productsLayer,
          ordersApiLayer,
          ordersEventsLayer,
          authUserInfoLayer,
        ],
        tracing: lambda.Tracing.ACTIVE,
      }
    )

    ordersDdb.grantReadWriteData(this.ordersHandler)
    props.productsDdb.grantReadData(this.ordersHandler)
    ordersTopic.grantPublish(this.ordersHandler)
    props.auditBus.grantPutEventsTo(this.ordersHandler)

    //Metric
    const productNotFoundMetricFilter =
      this.ordersHandler.logGroup.addMetricFilter('ProductNotFoundMetric', {
        metricName: 'OrderWithNonValidProduct',
        metricNamespace: 'ProductNotFound',
        filterPattern: logs.FilterPattern.literal('Some product was not found'),
      })

    //Alarm
    const productNotFoundAlarm = productNotFoundMetricFilter
      .metric()
      .with({
        statistic: 'Sum',
        period: cdk.Duration.minutes(2),
      })
      .createAlarm(this, 'ProductNotFoundAlarm', {
        alarmName: 'OrderWithNonValidProduct',
        alarmDescription:
          'Some product was not found while creating a new order',
        evaluationPeriods: 1,
        threshold: 2,
        actionsEnabled: true,
        comparisonOperator:
          cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      })
    //Action
    const orderAlarmsTopic = new sns.Topic(this, 'OrderAlarmsTopic', {
      displayName: 'Order alarms topic',
      topicName: 'order-alarms',
    })
    orderAlarmsTopic.addSubscription(
      new subs.EmailSubscription('gabrielmatuk14@gmail.com')
    )
    productNotFoundAlarm.addAlarmAction(
      new cw_actions.SnsAction(orderAlarmsTopic)
    )

    const orderEventsHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'OrdersEventsFunction',
      {
        functionName: 'OrdersEventsFunction',
        entry: 'lambda/orders/ordersEventsFunction.ts',
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
        layers: [ordersEventsLayer, ordersEventsRepositoryLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )

    ordersTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler))

    const eventsDdbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:PutItem'],
      resources: [props.eventsDbd.tableArn],
      conditions: {
        ['ForAllValues:StringLike']: {
          'dynamodb:LeadingKeys': ['#order_*'],
        },
      },
    })

    orderEventsHandler.addToRolePolicy(eventsDdbPolicy)

    const billingHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'BillingFunction',
      {
        functionName: 'BillingFunction',
        entry: 'lambda/orders/billingFunction.ts',
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

    ordersTopic.addSubscription(
      new subs.LambdaSubscription(billingHandler, {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['ORDER_CREATED'],
          }),
        },
      })
    )

    const orderEventsDlq = new sqs.Queue(this, 'OrderEventsDlq', {
      queueName: 'order-events-dlq',
      retentionPeriod: cdk.Duration.days(10),
    })

    const orderEventQueue = new sqs.Queue(this, 'OrderEventsQueue', {
      queueName: 'order-events',
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: orderEventsDlq,
      },
    })

    ordersTopic.addSubscription(
      new subs.SqsSubscription(orderEventQueue, {
        filterPolicy: {
          eventType: sns.SubscriptionFilter.stringFilter({
            allowlist: ['ORDER_CREATED'],
          }),
        },
      })
    )

    const orderEmailsHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'OrderEmailsFunction',
      {
        functionName: 'OrderEmailsFunction',
        entry: 'lambda/orders/orderEmailsFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          //como vamos empacotar o arquivo e subir na AWS.
          minify: true,
          sourceMap: false,
        },
        layers: [ordersEventsLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )
    orderEmailsHandler.addEventSource(
      new lambdaEventSource.SqsEventSource(orderEventQueue, {
        batchSize: 5,
        enabled: true,
        maxBatchingWindow: cdk.Duration.minutes(1),
      })
    )
    orderEventQueue.grantConsumeMessages(orderEmailsHandler)

    const orderEmailSesPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    })
    orderEmailsHandler.addToRolePolicy(orderEmailSesPolicy)

    this.orderEventsFetchHandler = new lambdaNodeJS.NodejsFunction(
      this,
      'OrderEventsFetchFunction',
      {
        functionName: 'OrderEventsFetchFunction',
        entry: 'lambda/orders/orderEventsFetchFunction.ts',
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
        layers: [ordersEventsRepositoryLayer],
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    )
    const eventsFetchDdbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:Query'],
      resources: [`${props.eventsDbd.tableArn}/index/emailIndex`],
    })
    this.orderEventsFetchHandler.addToRolePolicy(eventsFetchDdbPolicy)
  }
}
