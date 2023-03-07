import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as ssm from 'aws-cdk-lib/aws-ssm'

export class OrdersAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const orderLayer = new lambda.LayerVersion(this, 'OrdersLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/ordersLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      layerVersionName: 'OrdersLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    new ssm.StringParameter(this, 'OrdersLayerVersionArn', {
      parameterName: 'OrdersLayerVersionArn',

      stringValue: orderLayer.layerVersionArn,
    })

    const ordersApiLayer = new lambda.LayerVersion(this, 'ordersApiLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/ordersApiLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      layerVersionName: 'OrdersApiLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    new ssm.StringParameter(this, 'OrdersApiLayerVersionArn', {
      parameterName: 'OrdersApiLayerVersionArn',

      stringValue: ordersApiLayer.layerVersionArn,
    })

    const ordersEventsLayer = new lambda.LayerVersion(
      this,
      'ordersEventsLayer',
      {
        code: lambda.Code.fromAsset('lambda/orders/layers/ordersEventsLayer'),
        compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
        layerVersionName: 'OrdersEventsLayer',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    )

    new ssm.StringParameter(this, 'OrdersEventsLayerVersionArn', {
      parameterName: 'OrdersEventsLayerVersionArn',

      stringValue: ordersEventsLayer.layerVersionArn,
    })

    const ordersEventsRepositoryLayer = new lambda.LayerVersion(
      this,
      'ordersEventsRepositoryLayer',
      {
        code: lambda.Code.fromAsset(
          'lambda/orders/layers/ordersEventsRepositoryLayer'
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
        layerVersionName: 'OrdersRepositoryEventsLayer',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    )

    new ssm.StringParameter(this, 'OrdersEventsRepositoryLayerVersionArn', {
      parameterName: 'OrdersEventsRepositoryLayerVersionArn',

      stringValue: ordersEventsRepositoryLayer.layerVersionArn,
    })
  }
}
