import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'

import { Product, ProductRepository } from '/opt/nodejs/productsLayer'
import { DynamoDB } from 'aws-sdk'

const productsDdb = process.env.PRODUCTS_DDB!
const ddbClient = new DynamoDB.DocumentClient()

const productRepository = new ProductRepository(ddbClient, productsDdb)

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod

  //Buscar as informacoes do LAMBDA
  const lambdaRequestId = context.awsRequestId
  //Buscar informacao da API GATEWAY
  const apiRequestId = event.requestContext.requestId
  console.log(
    `API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`
  )

  if (event.resource === '/products') {
    console.log('POST /products')
    const product = JSON.parse(event.body!) as Product
    const productCreated = await productRepository.create(product)

    return {
      statusCode: 201,
      body: JSON.stringify(productCreated),
    }
  } else if (event.resource === '/products/{id}') {
    const productId = event.pathParameters!.id as string
    if (event.httpMethod === 'PUT') {
      console.log('PUT /products')
      return {
        statusCode: 201,
        body: `POST /products/${productId}`,
      }
    } else if (event.httpMethod === 'DELETE') {
      console.log(`DELETE /products/${productId}`)
      try {
        const product = await productRepository.deleteProduct(productId)
        return {
          statusCode: 200,
          body: JSON.stringify(product),
        }
      } catch (error) {
        console.error((<Error>error).message)
        return {
          statusCode: 404,
          body: (<Error>error).message,
        }
      }
    }
  }

  return {
    statusCode: 400,
    body: 'Bad request!',
  }
}
