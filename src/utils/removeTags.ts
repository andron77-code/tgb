export function removeTags(
  input: string,
  tags?: string | string[]
): string {
  if (!input) return input;

  // Если аргумент не передан — удаляем все HTML-теги
  if (!tags) {
    return input.replace(/<\/?[^>]+>/gi, "");
  }

  // Приводим к массиву
  const tagList = Array.isArray(tags) ? tags : [tags];

  let result = input;

  for (const tag of tagList) {
    const tagName = tag.trim();

    // Удаление открывающих и закрывающих тегов
    const regex = new RegExp(
      `<\\/?${tagName}\\b[^>]*>`,
      "gi"
    );

    result = result.replace(regex, "");
  }

  return result;
}
