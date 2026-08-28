// Validação e formatação de CPF/CNPJ (documento de login).

function apenasNumeros(v: string) {
  return v.replace(/\D/g, "");
}

export function validarCPF(cpfInput: string): boolean {
  const cpf = apenasNumeros(cpfInput);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}

export function validarCNPJ(cnpjInput: string): boolean {
  const cnpj = apenasNumeros(cnpjInput);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (base: string) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base
      .split("")
      .reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcularDigito(cnpj.slice(0, 12));
  const d2 = calcularDigito(cnpj.slice(0, 12) + d1);
  return cnpj === cnpj.slice(0, 12) + String(d1) + String(d2);
}

export function validarCpfOuCnpj(v: string): boolean {
  const n = apenasNumeros(v);
  if (n.length === 11) return validarCPF(n);
  if (n.length === 14) return validarCNPJ(n);
  return false;
}

export function formatarCpfCnpj(v: string): string {
  const n = apenasNumeros(v);
  if (n.length <= 11) {
    return n
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return n
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function normalizarDocumento(v: string): string {
  return apenasNumeros(v);
}
