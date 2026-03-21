export function hasRequiredValues(fields: Array<string | number | undefined | null>) {
  return fields.every((field) => `${field ?? ''}`.trim().length > 0);
}

export function collectFieldErrors(requiredFields: Record<string, string>) {
  return Object.keys(requiredFields).reduce<Record<string, string>>((result, key) => {
    if (!requiredFields[key]) {
      result[key] = '该字段不能为空';
    }

    return result;
  }, {});
}
