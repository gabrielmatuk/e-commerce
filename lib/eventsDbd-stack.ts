import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'

import { Construct } from 'constructs'

export class EventsDbdStack extends cdk.Stack {
  readonly table: dynamodb.Table
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.table = new dynamodb.Table(this, 'EventsDbd', {
      tableName: 'events',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    })

    this.table.addGlobalSecondaryIndex({
      indexName: 'emailIndex',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    })
  }
}
