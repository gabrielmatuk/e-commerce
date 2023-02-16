import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'

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
    return {
      statusCode: 201,
      body: 'POST /products',
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
      console.log('DELETE /products')
      return {
        statusCode: 201,
        body: 'DELETE /products',
      }
    }
  }

  return {
    statusCode: 400,
    body: 'Bad request!',
  }
}
