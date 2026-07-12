export function validateRegisterInput({ username, email, password }) {
  const errors = {};

  if (!username || username.trim().length < 3 || username.trim().length > 20) {
    errors.username = 'Имя пользователя должно быть от 3 до 20 символов';
  } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    errors.username = 'Разрешены только латинские буквы, цифры и "_"';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Введите корректный email';
  }

  if (!password || password.length < 6) {
    errors.password = 'Пароль должен быть не короче 6 символов';
  }

  return errors;
}

export function validateLoginInput({ identifier, password }) {
  const errors = {};

  if (!identifier || !identifier.trim()) {
    errors.identifier = 'Введите логин или email';
  }

  if (!password) {
    errors.password = 'Введите пароль';
  }

  return errors;
}
