import { Callback, Context, PreAuthenticationTriggerEvent } from 'aws-lambda'

export const handler = async (
  event: PreAuthenticationTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> => {
  console.log(event)

  if (event.request.userAttributes.email === 'testblock@test.com') {
    callback('This user is blocked. Reason: PAYMENT', event)
  } else {
    callback(null, event)
  }
}
