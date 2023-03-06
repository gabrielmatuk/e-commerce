import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'

import { Construct } from 'constructs'

export class AuditEventBusStack extends cdk.Stack {
  readonly bus: events.EventBus

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.bus = new events.EventBus(this, 'AuditEventBus', {
      eventBusName: 'AuditEventBus',
    })

    this.bus.archive('BusArchive', {
      eventPattern: {
        source: ['app.order'],
      },
      archiveName: 'auditEvents',
      retention: cdk.Duration.days(10),
    })

    //source: app.order
    //detailType: order
    //reason: PRODUCT_NOT_FOUND
    const nonValidOrderRule = new events.Rule(this, 'NonValidOrderRuke', {
      ruleName: 'NonValidOrderRule',
      description: 'Rule matching non valid order',
      eventBus: this.bus,
      eventPattern: {
        source: ['app.order'],
        detailType: ['order'],
        detail: {
          reason: ['PRODUCT_NOT_FOUND'],
        },
      },
    })

    //target
    const orderErrorsFunction = new lambdaNodeJS.NodejsFunction(
      this,
      'OrderErrorsFunction',
      {
        functionName: 'OrderErrorsFunction',
        entry: 'lambda/audit/orderErrorsFunction.ts',
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
    nonValidOrderRule.addTarget(new targets.LambdaFunction(orderErrorsFunction))

    //source: app.invoice
    //detailType: invoice
    //errorDetail: FAIL_NO_INVOICE_NUMBER
    const nonValidInvoiceRule = new events.Rule(this, 'NonValidInvoiceRule', {
      ruleName: 'NonValidInvoiceRule',
      description: 'Rule matching non valid invoice',
      eventBus: this.bus,
      eventPattern: {
        source: ['app.invoice'],
        detailType: ['invoice'],
        detail: {
          errorDetail: ['FAIL_NO_INVOICE_NUMBER'],
        },
      },
    })

    //target
    const invoicesErrorsFunction = new lambdaNodeJS.NodejsFunction(
      this,
      'InvoicesErrorsFunction',
      {
        functionName: 'InvoicesErrorsFunction',
        entry: 'lambda/audit/invoicesErrorsFunction.ts',
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
    nonValidInvoiceRule.addTarget(
      new targets.LambdaFunction(invoicesErrorsFunction)
    )
  }
}