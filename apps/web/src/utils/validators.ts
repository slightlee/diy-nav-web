export const isValidEmail = (email: string): boolean => {
  // Mainstream email providers whitelist
  const allowedDomains = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'icloud.com', // Global
    'qq.com',
    '163.com',
    '126.com',
    'sina.com',
    'aliyun.com',
    'foxmail.com' // China
  ]

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false

  const domain = email.split('@')[1].toLowerCase()
  return allowedDomains.includes(domain)
}

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8
}
