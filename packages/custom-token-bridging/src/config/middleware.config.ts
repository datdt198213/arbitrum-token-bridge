import camelcaseKeys from 'camelcase-keys';

export const camelcase = () => {
  return function (req: any, res: any, next: any) {
    req.body = camelcaseKeys(req.body, { deep: true })
    req.params = camelcaseKeys(req.params)
    req.query = camelcaseKeys(req.query)
    next()
  }
}
