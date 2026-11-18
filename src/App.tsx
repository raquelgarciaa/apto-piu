import { createContext, FormEvent, PointerEvent as ReactPointerEvent, useContext, useRef, useState } from "react";

type Screen =
  | "login"
  | "signup"
  | "home"
  | "filters"
  | "profile"
  | "roommate"
  | "map"
  | "property"
  | "property-roommate"
  | "property-rental"
  | "proposals"
  | "tenant-business"
  | "host-offer"
  | "host-add-property"
  | "host-candidates"
  | "host-profile"
  | "host-requests"
  | "landlord-business"
  | "landlord-add"
  | "landlord-edit"
  | "landlord-profile"
  | "chat-history"
  | "chat";

type ChatPartner = "host" | "landlord" | "tenant";

type ProfileRole = "Anfitrião" | "Colega de quarto" | "Locador" | "Locatário";
type MockUser = { id: string; name: string; email: string; role: ProfileRole; roles?: ProfileRole[]; profileLabel: string; password?: string };
const profileRoles: ProfileRole[] = ["Anfitrião", "Colega de quarto", "Locador", "Locatário"];
const initialMockUsers: MockUser[] = [
  { id: "joao-souza", name: "João Souza", email: "joao.souza@apto.com", role: "Colega de quarto", roles: ["Colega de quarto", "Locatário"], profileLabel: "Colega de quarto e locatário" },
  { id: "ana-beatriz", name: "Ana Beatriz", email: "ana.beatriz@apto.com", role: "Anfitrião", roles: ["Anfitrião"], profileLabel: "Anfitriã" },
  { id: "roberto-silva", name: "Roberto Silva", email: "roberto.silva@apto.com", role: "Locador", roles: ["Locador"], profileLabel: "Locador" },
];
const RoleContext = createContext<{ role: ProfileRole; setRole: (role: ProfileRole) => void }>({
  role: "Locatário",
  setRole: () => {},
});
const UserContext = createContext<{ user: MockUser | null; users: MockUser[]; setUser: (user: MockUser | null) => void; registerUser: (user: MockUser) => void }>({
  user: null,
  users: initialMockUsers,
  setUser: () => {},
  registerUser: () => {},
});

function readMockUsers(): MockUser[] {
  try {
    const saved = window.localStorage.getItem("apto-users");
    if (saved) {
      const users = JSON.parse(saved);
      if (Array.isArray(users)) return (users as unknown[])
        .filter((account): account is MockUser => Boolean(account) && typeof account === "object" && typeof (account as MockUser).id === "string" && typeof (account as MockUser).email === "string")
        .map((account) => {
        const seed = initialMockUsers.find((item) => item.id === account.id);
        return seed ? { ...account, role: seed.role, roles: seed.roles, profileLabel: seed.profileLabel } : account;
      });
    }
  } catch {
    // Fall back to the built-in demo accounts if storage is unavailable or invalid.
  }
  return initialMockUsers;
}

const A = "/assets";

function rolesForUser(user: MockUser | null, activeRole: ProfileRole): ProfileRole[] {
  if (Array.isArray(user?.roles) && user.roles.length) return user.roles;
  if (user?.id === "joao-souza") return ["Colega de quarto", "Locatário"];
  if (user?.id === "ana-beatriz") return ["Anfitrião"];
  if (user?.id === "roberto-silva") return ["Locador"];
  return [user?.role ?? activeRole];
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <img
        src={`${A}/${compact ? "6ddf3" : "ddccb"}.svg`}
        className={compact ? "h-[31px] w-[33px]" : "h-[39px] w-10"}
        alt=""
      />
      <span
        className={`font-jost font-black text-[#7501dd] ${compact ? "text-[15px]" : "text-[22px]"}`}
      >
        APTO
      </span>
    </div>
  );
}

function ProfileRoleSelector({
  label,
  roles,
  setRoles,
}: {
  label?: string;
  roles: ProfileRole[];
  setRoles: (roles: ProfileRole[]) => void;
}) {
  const toggleRole = (option: ProfileRole) => {
    if (option === "Locador") {
      setRoles(roles.includes(option) ? [] : [option]);
      return;
    }
    const withoutLandlord = roles.filter((role) => role !== "Locador");
    setRoles(withoutLandlord.includes(option)
      ? withoutLandlord.filter((role) => role !== option)
      : [...withoutLandlord, option]);
  };
  return (
    <fieldset className="profile-role-picker">
      {label && <legend>{label}</legend>}
      <div className="grid grid-cols-2 gap-2">
        {profileRoles.map((option) => (
          <label key={option} className={`profile-role-option ${roles.includes(option) ? "selected" : ""}`}>
            <input
              type="checkbox"
              name="profile-roles"
              value={option}
              checked={roles.includes(option)}
              onChange={() => toggleRole(option)}
              aria-label={option}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PasswordField({
  label = "Senha",
  placeholder = "Digite sua senha",
  value,
  onChange,
  minLength,
  id = "password-field",
  error,
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  minLength?: number;
  id?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className={`field ${error ? "field-invalid" : ""}`}>
        <span>{label}</span>
        <span className="input-wrap">
          <input id={id} type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={(event) => onChange?.(event.target.value)} minLength={minLength} required aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-error` : undefined} />
          <button
            type="button"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShow(!show)}
          >
            <img src={`${A}/29898.svg`} className="size-5" alt="" />
          </button>
        </span>
      </label>
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

function InlineFieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="field-error" role="alert">{message}</p> : null;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login({ go }: { go: (screen: Screen) => void }) {
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { users, setUser } = useContext(UserContext);
  const loginAs = (user: MockUser) => {
    setUser(user);
    go("home");
  };
  function submit(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    const nextErrors: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) nextErrors.email = "Informe seu e-mail.";
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = "Digite um e-mail válido.";
    if (!password) nextErrors.password = "Informe sua senha.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const user = users.find((account) => account.email.toLowerCase() === normalizedEmail);
    if (!user) {
      setErrors({ email: "Não encontramos uma conta com esse e-mail." });
      return;
    }
    if (user.password && user.password !== password) {
      setErrors({ password: "Senha incorreta." });
      return;
    }
    setErrors({});
    loginAs(user);
  }
  return (
    <main className="auth-page">
      <section className="auth-content">
        <Logo />
        <div className="space-y-2">
          <h1>Que bom ter você aqui!</h1>
          <p className="muted">
            Entre para encontrar seu lugar e quem vai compartilhar essa nova fase com você.
          </p>
        </div>
        <form className="space-y-6" onSubmit={submit} noValidate>
          <div className="space-y-1.5">
            <label className={`field ${errors.email ? "field-invalid" : ""}`}>
              <span>E-mail</span>
              <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: undefined })); setNotice(""); }} placeholder="Digite seu e-mail" required aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "login-email-error" : undefined} />
            </label>
            <InlineFieldError id="login-email-error" message={errors.email} />
          </div>
          <div className="space-y-2">
            <PasswordField id="login-password" value={password} onChange={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })); setNotice(""); }} error={errors.password} />
            <button
              type="button"
              className="ml-auto block h-8 text-sm font-medium text-[#7501dd]"
              onClick={() => {
                const normalizedEmail = email.trim();
                if (!normalizedEmail) setErrors({ email: "Informe seu e-mail para recuperar a senha." });
                else if (!emailPattern.test(normalizedEmail)) setErrors({ email: "Digite um e-mail válido." });
                else setNotice("As instruções de recuperação foram simuladas para este e-mail.");
              }}
            >
              Esqueci minha senha
            </button>
          </div>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <button className="primary-btn" type="submit">
            Entrar
          </button>
          <p className="text-center text-sm text-[#655e69]">
            Ainda não tem uma conta?{" "}
            <button
              type="button"
              className="font-semibold text-[#7501dd]"
              onClick={() => go("signup")}
            >
              Cadastre-se
            </button>
          </p>
        </form>
      </section>
      <footer className="mb-[72px] mt-auto text-center text-xs text-[#655e69]">
        <span className="mx-auto mb-4 block h-0.5 w-10 bg-[#ddd7e2]" />
        Um novo lar. Boas conexões. Seu jeito de morar.
      </footer>
    </main>
  );
}

const signupGroups = [
  ["Fuma", ["Sim", "Não"]],
  ["Ingere bebidas alcoólicas", ["Sim", "Não", "Socialmente"]],
  ["Trabalha", ["Sim", "Não"]],
  ["Possui carro", ["Sim", "Não"]],
  ["Possui pets", ["Sim", "Não"]],
  ["Horário de dormir", ["Cedo", "Tarde", "Varia"]],
  ["Na faculdade", ["Sim", "Não"]],
  ["Em algum relacionamento", ["Sim", "Não"]],
  ["Recebe visitas frequentes", ["Sim", "Não"]],
] as const;

function ChoiceRow({
  label,
  options,
  disabled = false,
  compact = false,
  selectedValue,
  onValueChange,
  error,
}: {
  label: string;
  options: readonly string[];
  disabled?: boolean;
  compact?: boolean;
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  error?: string;
}) {
  const [localValue, setLocalValue] = useState("");
  const value = selectedValue ?? localValue;
  const selectValue = (nextValue: string) => {
    setLocalValue(nextValue);
    onValueChange?.(nextValue);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => selectValue(option)}
            aria-pressed={value === option}
            className={`choice ${compact ? "profile-choice" : ""} ${value === option ? "choice-active" : ""} disabled:cursor-default`}
          >
            {option}
          </button>
        ))}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </fieldset>
  );
}

function Signup({ go }: { go: (screen: Screen) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [compatibility, setCompatibility] = useState<Record<string, string>>({});
  const { role } = useContext(RoleContext);
  const [selectedRoles, setSelectedRoles] = useState<ProfileRole[]>([role]);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string; terms?: string; profile?: string; compatibility?: Record<string, string | undefined> }>({});
  const { users, registerUser } = useContext(UserContext);
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: { name?: string; email?: string; password?: string; confirmPassword?: string; terms?: string; profile?: string; compatibility?: Record<string, string | undefined> } = {};
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedName) nextErrors.name = "Informe seu nome completo.";
    else if (normalizedName.split(/\s+/).length < 2) nextErrors.name = "Digite seu nome e sobrenome.";
    if (!normalizedEmail) nextErrors.email = "Informe seu e-mail.";
    else if (!emailPattern.test(normalizedEmail)) nextErrors.email = "Digite um e-mail válido.";
    if (!password) nextErrors.password = "Crie uma senha.";
    else if (!/(?=.*\p{L})(?=.*\d).{8,}/u.test(password)) nextErrors.password = "Use pelo menos 8 caracteres, incluindo letras e números.";
    if (!confirmPassword) nextErrors.confirmPassword = "Confirme sua senha.";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "As senhas não coincidem.";
    if (!selectedRoles.length) nextErrors.profile = "Escolha pelo menos um perfil.";
    if (!(selectedRoles.length === 1 && selectedRoles[0] === "Locador")) {
      const compatibilityErrors: Record<string, string> = {};
      if (!compatibility["Gênero"]) compatibilityErrors["Gênero"] = "Selecione uma opção.";
      if (!compatibility["Idade"]?.trim()) compatibilityErrors["Idade"] = "Informe sua idade.";
      for (const [label] of signupGroups) {
        if (!compatibility[label]) compatibilityErrors[label] = "Selecione uma opção.";
      }
      if (!compatibility.Curso?.trim()) compatibilityErrors.Curso = "Informe seu curso.";
      if (Object.keys(compatibilityErrors).length) nextErrors.compatibility = compatibilityErrors;
    }
    if (!accepted) nextErrors.terms = "Aceite os termos para criar sua conta.";
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      nextErrors.email = "Já existe uma conta com esse e-mail.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const primaryRole: ProfileRole = selectedRoles.includes("Locador") ? "Locador"
      : selectedRoles.includes("Anfitrião") ? "Anfitrião"
      : selectedRoles.includes("Colega de quarto") ? "Colega de quarto"
      : "Locatário";
    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      name: normalizedName,
      email: normalizedEmail,
      role: primaryRole,
      roles: [...selectedRoles],
      profileLabel: selectedRoles.join(" e "),
      password,
    };
    registerUser(newUser);
    go("home");
  }
  return (
    <main className="min-h-dvh bg-white px-6 pb-8 pt-10">
      <div className="w-full">
        <Logo />
        <div className="mt-10">
          <h1>Crie sua conta</h1>
          <p className="muted mt-2">Seu novo jeito de morar começa aqui.</p>
        </div>
        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-1.5">
            <label className={`field ${errors.name ? "field-invalid" : ""}`}>
              <span>Nome completo</span>
              <input value={name} onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })); }} placeholder="Digite seu nome completo" required aria-invalid={errors.name ? "true" : undefined} aria-describedby={errors.name ? "signup-name-error" : undefined} />
            </label>
            <InlineFieldError id="signup-name-error" message={errors.name} />
          </div>
          <div className="space-y-1.5">
            <label className={`field ${errors.email ? "field-invalid" : ""}`}>
              <span>E-mail</span>
              <input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: undefined })); }} placeholder="Digite seu e-mail" required aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "signup-email-error" : undefined} />
            </label>
            <InlineFieldError id="signup-email-error" message={errors.email} />
          </div>
          <PasswordField id="signup-password" value={password} onChange={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })); }} placeholder="Crie uma senha" minLength={8} error={errors.password} />
          <p className="-mt-2 text-xs text-[#655e69]">
            Use pelo menos 8 caracteres, incluindo letras e números.
          </p>
          <PasswordField id="signup-confirm-password" label="Confirmar senha" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setErrors((current) => ({ ...current, confirmPassword: undefined })); }} placeholder="Digite a senha novamente" error={errors.confirmPassword} />
          <div className="border-t border-[#e8e2ec] pt-6">
            <h2 className="text-xl font-semibold">{selectedRoles.length === 1 && selectedRoles[0] === "Locador" ? "Tipo de perfil" : "Perfil de compatibilidade"}</h2>
          </div>
          <ProfileRoleSelector label="Tipo de perfil" roles={selectedRoles} setRoles={(nextRoles) => { setSelectedRoles(nextRoles); setErrors((current) => ({ ...current, profile: undefined })); }} />
          <InlineFieldError id="signup-profile-error" message={errors.profile} />
          <p className="muted text-sm">Conte sobre você para encontrar colegas com mais afinidade. Todos os campos são obrigatórios, exceto para locadores.</p>
          {!(selectedRoles.length === 1 && selectedRoles[0] === "Locador") && (
            <>
              <h3 className="font-semibold">Sobre você</h3>
              <ChoiceRow label="Gênero" options={["Feminino", "Masculino", "Outro", "Não informar"]} selectedValue={compatibility["Gênero"]} onValueChange={(value) => { setCompatibility((current) => ({ ...current, "Gênero": value })); setErrors((current) => ({ ...current, compatibility: { ...current.compatibility, "Gênero": undefined } })); }} error={errors.compatibility?.["Gênero"]} />
              <label className={`field ${errors.compatibility?.["Idade"] ? "field-invalid" : ""}`}>
                <span>Idade</span>
                <input type="number" value={compatibility["Idade"] ?? ""} onChange={(event) => { setCompatibility((current) => ({ ...current, "Idade": event.target.value })); setErrors((current) => ({ ...current, compatibility: { ...current.compatibility, "Idade": undefined } })); }} placeholder="Digite sua idade" aria-invalid={errors.compatibility?.["Idade"] ? "true" : undefined} />
                {errors.compatibility?.["Idade"] && <span className="field-error">{errors.compatibility["Idade"]}</span>}
              </label>
              <h3 className="pt-2 font-semibold">Hábitos e rotina</h3>
              {signupGroups.slice(0, 6).map(([label, options]) => (
                <ChoiceRow key={label} label={label} options={options} selectedValue={compatibility[label]} onValueChange={(value) => { setCompatibility((current) => ({ ...current, [label]: value })); setErrors((current) => ({ ...current, compatibility: { ...current.compatibility, [label]: undefined } as Record<string, string> })); }} error={errors.compatibility?.[label]} />
              ))}
              <h3 className="pt-2 font-semibold">Estudos e convivência</h3>
              <ChoiceRow label={signupGroups[6][0]} options={signupGroups[6][1]} selectedValue={compatibility[signupGroups[6][0]]} onValueChange={(value) => { setCompatibility((current) => ({ ...current, [signupGroups[6][0]]: value })); setErrors((current) => ({ ...current, compatibility: { ...current.compatibility, [signupGroups[6][0]]: undefined } })); }} error={errors.compatibility?.[signupGroups[6][0]]} />
              <label className={`field ${errors.compatibility?.Curso ? "field-invalid" : ""}`}>
                <span>Curso</span>
                <input value={compatibility.Curso ?? ""} onChange={(event) => { setCompatibility((current) => ({ ...current, Curso: event.target.value })); setErrors((current) => ({ ...current, compatibility: { ...current.compatibility, Curso: undefined } })); }} placeholder="Digite seu curso" aria-invalid={errors.compatibility?.Curso ? "true" : undefined} />
                {errors.compatibility?.Curso && <span className="field-error">{errors.compatibility.Curso}</span>}
              </label>
              {signupGroups.slice(7).map(([label, options]) => (
                <ChoiceRow key={label} label={label} options={options} selectedValue={compatibility[label]} onValueChange={(value) => { setCompatibility((current) => ({ ...current, [label]: value })); setErrors((current) => ({ ...current, compatibility: { ...current.compatibility, [label]: undefined } as Record<string, string> })); }} error={errors.compatibility?.[label]} />
              ))}
            </>
          )}
          <label className="flex items-start gap-3 py-2 text-xs text-[#655e69]">
            <input
              aria-invalid={errors.terms ? "true" : undefined}
              aria-describedby={errors.terms ? "signup-terms-error" : undefined}
              className="mt-0.5 size-5 accent-[#a100ff]"
              type="checkbox"
              checked={accepted}
              onChange={(e) => { setAccepted(e.target.checked); if (e.target.checked) setErrors((current) => ({ ...current, terms: undefined })); }}
            />
            <span>
              Li e aceito os <u className="font-medium text-[#7501dd]">Termos de Uso</u> e{" "}
              <u className="font-medium text-[#7501dd]">Política de Privacidade</u>.
            </span>
          </label>
          <InlineFieldError id="signup-terms-error" message={errors.terms} />
          <button type="submit" className="primary-btn">
            Criar conta
          </button>
          <p className="text-center text-sm text-[#655e69]">
            Já tem uma conta?{" "}
            <button
              type="button"
              className="font-semibold text-[#7501dd]"
              onClick={() => go("login")}
            >
              Entrar
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}

function BottomNav({ active, go }: { active: Screen; go: (screen: Screen) => void }) {
  const { role } = useContext(RoleContext);
  const { user } = useContext(UserContext);
  const roles = rolesForUser(user, role);
  const hasHostTools = roles.some((item) => item === "Anfitrião" || item === "Colega de quarto");
  const hasBusiness = roles.some((item) => item === "Locatário" || item === "Locador");
  const businessDestination: Screen = roles.includes("Locador") ? "landlord-business" : "tenant-business";
  const proposalDestination: Screen = roles.includes("Anfitrião") ? "host-requests" : "proposals";
  const navItems: [string, string, Screen][] = [
    ["09331.svg", "Home", "home"],
    ...(hasHostTools ? [["5fd9e.svg", "Proposta", proposalDestination], ["99271.svg", "Colega\nde quarto", "roommate"]] as [string, string, Screen][] : []),
    ...(hasBusiness ? [["61c46.svg", "Negócios", businessDestination]] as [string, string, Screen][] : []),
    ["97e6d.svg", "Conta", "profile"],
  ];
  const compactMenu = navItems.length === 3;
  return (
    <nav className={`sticky bottom-0 z-20 flex h-24 items-center ${compactMenu ? "justify-around" : "justify-between"} bg-[#e4b5ef] px-4 py-3`}>
      {navItems.map(([icon, label, destination]) => (
        <button
          key={label}
          type="button"
          onClick={() => destination && go(destination as Screen)}
          className={`flex size-[61px] flex-col items-center justify-center gap-2 rounded-full text-[9px] ${active === destination || (active === "host-offer" && label === "Colega\nde quarto") ? "bg-[#bc90c7]" : ""}`}
        >
          <img src={`${A}/${icon}`} className="h-6 w-6 object-contain" alt="" />
          <span className="whitespace-pre-line leading-tight">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Header({
  go,
  logoAsset = "6ddf3.svg",
}: {
  go: (screen: Screen) => void;
  logoAsset?: string;
}) {
  return (
    <header className="flex h-[66px] items-center justify-between px-[18px]">
      <div className="flex items-center gap-1.5">
        <img src={`${A}/${logoAsset}`} className="h-[31px] w-[33px]" alt="" />
        <span className="font-jost text-[15px] font-black text-[#7501dd]">APTO</span>
      </div>
      <button type="button" onClick={() => go("chat-history")} aria-label="Abrir histórico de conversas" className="grid size-10 place-items-center rounded-full hover:bg-[#f4e9fb]">
        <img src={`${A}/c3608.svg`} className="size-6" alt="" />
      </button>
    </header>
  );
}

type FilterState = {
  purpose: string;
  types: string[];
  rooms: string;
  baths: string;
  garage: string;
  furniture: string;
  amenities: string[];
};

const initialFilters: FilterState = {
  purpose: "Tanto faz",
  types: ["Apartamento", "Casa"],
  rooms: "2+",
  baths: "2+",
  garage: "2+",
  furniture: "Tanto faz",
  amenities: [],
};

function countActiveFilters(filters: FilterState) {
  return (
    filters.types.length +
    [filters.rooms, filters.baths, filters.garage].filter((value) => value !== "Qualquer").length +
    [filters.purpose, filters.furniture].filter((value) => value !== "Tanto faz").length +
    filters.amenities.length
  );
}

function ListingCard({ second = false, onClick }: { second?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
    <article className="overflow-hidden rounded-[10px] border border-black/50 bg-white">
      <div className="relative h-[147px]">
        <img
          src={`${A}/f2a6e.png`}
          className="h-full w-full object-cover"
          alt="Sala ampla e iluminada do imóvel"
        />
        <span
          className={`absolute left-1.5 top-3 min-w-36 rounded-full px-8 py-1 text-center text-[13px] text-white ${second ? "bg-[#0ca719]" : "bg-[#eab310]"}`}
        >
          {second ? "Para alugar" : "Para dividir"}
        </span>
      </div>
      <div className="flex min-h-[99px] justify-between gap-4 p-2.5">
        <div className="space-y-1">
          <h3 className="text-[15px] font-medium">
            {second ? "Casa comercial" : "Condominínio RedeMais"}
          </h3>
          <p className="text-sm font-semibold">{second ? "R$ 1.500 por mês" : "R$ 200 por mês"}</p>
          <p className="text-[13px]">
            {second ? "Capim Macio, Rua xxxx" : "Ponta Negra, Rua xxxx"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between">
          <span
            className={`rounded-full px-3 py-1 text-[10px] text-white ${second ? "bg-[#c60003]" : "bg-[#a100ff]"}`}
          >
            {second ? "Não mobiliado" : "Mobiliado"}
          </span>
          <span className="flex items-center gap-1 text-xs">
            <img
              className="size-[15px] rounded-full"
              src={`${A}/${second ? "49c93" : "36039"}.png`}
              alt=""
            />
            {second ? "Marcos Carvalho" : "Gabriel Sousa"}
          </span>
        </div>
      </div>
    </article>
    </button>
  );
}

function Home({
  go,
  filters,
  setFilters,
  clearFilters,
}: {
  go: (screen: Screen) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  clearFilters: () => void;
}) {
  const [search, setSearch] = useState("");
  const selectedFilterCount = countActiveFilters(filters);
  const chips = [
    ...filters.types.map((label) => ({
      label,
      remove: () =>
        setFilters({ ...filters, types: filters.types.filter((type) => type !== label) }),
    })),
    ...(filters.rooms !== "Qualquer"
      ? [
          {
            label: `${filters.rooms.replace("+", "")} quartos`,
            remove: () => setFilters({ ...filters, rooms: "Qualquer" }),
          },
        ]
      : []),
    ...(filters.baths !== "Qualquer"
      ? [
          {
            label: `${filters.baths.replace("+", "")} banheiros`,
            remove: () => setFilters({ ...filters, baths: "Qualquer" }),
          },
        ]
      : []),
    ...(filters.garage !== "Qualquer"
      ? [
          {
            label: `${filters.garage.replace("+", "")} garagem`,
            remove: () => setFilters({ ...filters, garage: "Qualquer" }),
          },
        ]
      : []),
  ];
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <Header go={go} />
      <div className="flex-1 px-[18px] pb-4">
        <div className="flex items-center gap-2">
          <label className="flex h-[29px] flex-1 items-center rounded-full border border-black/50 px-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquise algum imóvel..."
              className="w-full bg-transparent text-[13px] outline-none"
            />
            <span className="text-xl leading-none">⌕</span>
          </label>
          <button className="relative" aria-label={`Abrir filtros, ${selectedFilterCount} selecionados`} onClick={() => go("filters")}>
            <img src={`${A}/e80ed.svg`} className="size-[30px]" alt="" />
            <span className="absolute -right-1 -top-1 rounded-full border border-black/40 bg-white px-1 text-[7px] text-[#4e1e79]">
              {selectedFilterCount}
            </span>
          </button>
        </div>
        <div className="mt-7 flex min-h-[52px] flex-wrap content-start gap-2">
          {chips.map((chip) => (
            <span key={chip.label} className="filter-tag">
              {chip.label}
              <button
                type="button"
                onClick={chip.remove}
                aria-label={`Remover filtro ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
          {selectedFilterCount > 0 && (
            <button
              className="h-[18px] rounded-full bg-[#e7e2e9] px-3 text-[10px]"
              onClick={clearFilters}
            >
              Limpar
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-[30px]">
          <ListingCard onClick={() => go("property-roommate")} />
          <ListingCard second onClick={() => go("property-rental")} />
        </div>
      </div>
      <BottomNav active="home" go={go} />
    </main>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`filter-chip ${selected ? "selected" : ""}`}>
      {selected && <span className="font-bold">✓</span>}
      {children}
    </button>
  );
}

function Filters({
  go,
  filters,
  setFilters,
}: {
  go: (screen: Screen) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setDraft({ ...draft, [key]: value });
  const toggle = (key: "types" | "amenities", value: string) =>
    set(
      key,
      draft[key].includes(value) ? draft[key].filter((v) => v !== value) : [...draft[key], value],
    );
  const quantities: [keyof FilterState, string][] = [
    ["rooms", "Quartos"],
    ["baths", "Banheiros"],
    ["garage", "Garagem"],
  ];
  return (
    <main className="min-h-dvh bg-white">
      <Header go={go} />
      <div className="flex items-center gap-2 px-3 pb-[17px] pt-1">
        <button
          className="flex size-8 items-center justify-center text-3xl font-light"
          onClick={() => go("home")}
        >
          ‹
        </button>
        <div className="flex-1">
          <h1 className="text-xl">Filtros</h1>
          <p className="text-xs text-[#706a73]">Encontre o imóvel do seu jeito.</p>
        </div>
        <button
          className="text-xs font-semibold text-[#7501dd]"
          onClick={() => setDraft(initialFilters)}
        >
          Limpar filtros
        </button>
      </div>
      <div className="space-y-5 px-[18px] pb-4 pt-2">
        <section className="filter-group">
          <h2>O que você procura?</h2>
          <div className="chips">
            {["Tanto faz", "Alugar", "Dividir", "Comprar"].map((x) => (
              <Chip key={x} selected={draft.purpose === x} onClick={() => set("purpose", x)}>
                {x}
              </Chip>
            ))}
          </div>
        </section>
        <section className="filter-group">
          <div className="flex justify-between">
            <h2>Tipo de imóvel</h2>
            <small>Selecione um ou mais</small>
          </div>
          <div className="chips">
            {["Apartamento", "Casa", "Kitnet", "Quarto", "Comercial"].map((x) => (
              <Chip key={x} selected={draft.types.includes(x)} onClick={() => toggle("types", x)}>
                {x}
              </Chip>
            ))}
          </div>
        </section>
        <section className="filter-group">
          <h2>Características</h2>
          <div className="space-y-2.5">
            {quantities.map(([key, label]) => (
              <div className="flex items-center justify-between gap-2" key={key}>
                <span className="text-xs">{label}</span>
                <div className="flex gap-1">
                  {["Qualquer", "1+", "2+", "3+"].map((x) => (
                    <Chip key={x} selected={draft[key] === x} onClick={() => set(key, x)}>
                      {x}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="filter-group">
          <h2>Mobília</h2>
          <div className="chips">
            {["Tanto faz", "Mobiliado", "Não mobiliado"].map((x) => (
              <Chip key={x} selected={draft.furniture === x} onClick={() => set("furniture", x)}>
                {x}
              </Chip>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Comodidades</h2>
          <div className="chips">
            {["Aceita pets", "Elevador", "Varanda", "Piscina", "Portaria 24h"].map((x) => (
              <Chip
                key={x}
                selected={draft.amenities.includes(x)}
                onClick={() => toggle("amenities", x)}
              >
                {x}
              </Chip>
            ))}
          </div>
        </section>
      </div>
      <div className="border-t border-[#e7e2e9] px-[18px] pb-[18px] pt-3.5 text-center">
        <p className="mb-2.5 text-xs text-[#706a73]">24 imóveis encontrados com estes filtros</p>
        <button
          className="primary-btn !h-[46px]"
          onClick={() => {
            setFilters(draft);
            go("home");
          }}
        >
          Aplicar filtros <span className="ml-2 text-xl">→</span>
        </button>
      </div>
      <BottomNav active="home" go={go} />
    </main>
  );
}

function RoommateCard({ second = false, onClick }: { second?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full overflow-hidden rounded-[10px] border border-black/50 bg-white text-left"
    >
      <img
        src={`${A}/f2a6e.png`}
        className="h-[147px] w-full object-cover"
        alt={second ? "Apartamento com quarto livre" : "Condomínio de luxo"}
      />
      <div className="flex min-h-[99px] items-center justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-[15px] font-medium">
            {second ? "Apartamento, quarto livre" : "Condominínio de luxo"}
          </h3>
          <p className="text-sm font-semibold">{second ? "R$ 700 por mês" : "R$ 200 por mês"}</p>
          <p className="text-[13px]">Ponta Negra, Rua xxxx</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-[#0ca719] px-3 py-1 text-[10px] text-white">
            90% de compatibilidade
          </span>
          <span className="flex items-center gap-1 text-xs">
            <img
              src={`${A}/${second ? "b5b70" : "36039"}.png`}
              className="size-[15px] rounded-full"
              alt=""
            />
            {second ? "Juliana Lima" : "Gabriel Sousa"}
          </span>
          <span className="flex gap-1">
            <small className="rounded-full bg-[#e7e2e9] px-1 py-0.5 text-[10px]">
              Sem fumantes
            </small>
            <small className="rounded-full bg-[#e7e2e9] px-1 py-0.5 text-[10px]">Sem pets</small>
          </span>
        </div>
      </div>
    </button>
  );
}

function Roommate({ go }: { go: (screen: Screen) => void }) {
  const { role } = useContext(RoleContext);
  const canOfferRoom = role === "Anfitrião";
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <Header go={go} logoAsset="c5b05.svg" />
      <div className="flex-1 px-[18px]">
        <div className="flex h-[21px] overflow-hidden rounded-full bg-[#e7e2e9] text-sm">
          <button className="flex-1 rounded-full bg-[#bc90c7]">Buscar casa</button>
          <button
            type="button"
            onClick={() => canOfferRoom && go("host-offer")}
            disabled={!canOfferRoom}
            aria-disabled={!canOfferRoom}
            className={`flex-1 text-[#3b3939] ${canOfferRoom ? "" : "cursor-not-allowed text-[#9d96a1]"}`}
          >
            Oferecer vaga
          </button>
        </div>
        <h1 className="mt-4 text-sm tracking-normal">Encontre seu colega de quarto!</h1>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm font-semibold">Filtrar por:</span>
          <button
            type="button"
            onClick={() => go("map")}
            className="flex items-center gap-1 rounded-full bg-[#0077d3] px-2 py-0.5 text-[10px] text-white"
          >
            <img src={`${A}/c3fc7.svg`} className="h-[15px] w-4" alt="" />
            Localização
          </button>
        </div>
        <div className="mt-5 space-y-[31px] pb-8">
          <RoommateCard onClick={() => go("property-roommate")} />
          <RoommateCard second onClick={() => go("property-roommate")} />
        </div>
      </div>
      <BottomNav active="roommate" go={go} />
    </main>
  );
}

function MapView({ go }: { go: (screen: Screen) => void }) {
  const [selected, setSelected] = useState(false);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(1.15);
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [reference, setReference] = useState("Instituto Metrópole Digital...");
  const [minBudget, setMinBudget] = useState(50);
  const [maxBudget, setMaxBudget] = useState(700);
  const budgetMin = 0;
  const budgetMax = 1000;
  const minPosition = ((minBudget - budgetMin) / (budgetMax - budgetMin)) * 100;
  const maxPosition = ((maxBudget - budgetMin) / (budgetMax - budgetMin)) * 100;
  const changeZoom = (nextZoom: number) => {
    const zoom = Math.min(2, Math.max(1, nextZoom));
    setMapZoom(zoom);
    if (zoom === 1) setMapPosition({ x: 0, y: 0 });
  };
  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: mapPosition.x,
      startY: mapPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const dragMap = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const horizontalLimit = Math.max(0, (mapZoom - 1) * 195);
    const verticalLimit = Math.max(0, (mapZoom - 1) * 422);
    setMapPosition({
      x: Math.max(
        -horizontalLimit,
        Math.min(horizontalLimit, drag.startX + event.clientX - drag.clientX),
      ),
      y: Math.max(
        -verticalLimit,
        Math.min(verticalLimit, drag.startY + event.clientY - drag.clientY),
      ),
    });
  };
  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };
  return (
    <main className="relative min-h-dvh touch-none overflow-hidden bg-[#eee]">
      <div
        className="absolute inset-0 cursor-grab select-none will-change-transform active:cursor-grabbing"
        style={{
          transform: `translate3d(${mapPosition.x}px, ${mapPosition.y}px, 0) scale(${mapZoom})`,
          transformOrigin: "center",
        }}
        onPointerDown={startDragging}
        onPointerMove={dragMap}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onDoubleClick={() => changeZoom(mapZoom + 0.25)}
      >
        <img
          src={`${A}/7c953.png`}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          alt="Mapa da região de Cerqueira César"
          draggable={false}
        />
        <div className="absolute left-[99px] top-[200px] size-[161px] rounded-full border-2 border-dashed border-black/70" />
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setSelected(true)}
          aria-label="Casa Zona Sul, R$ 99,90 por mês, 95% de compatibilidade"
          className="absolute left-[205px] top-[301px] h-[73px] w-[119px] overflow-visible text-left"
        >
          <img src={`${A}/75f04.svg`} className="absolute -top-2 left-0" alt="" />
          <img
            src={`${A}/d1007.png`}
            className="absolute left-[5px] top-[10px] size-[31px] rounded-lg object-cover"
            alt=""
          />
          <span className="absolute left-[39px] top-[8px] w-9 text-white">
            <b className="block text-[13px] leading-[13px]">R$</b>
            <span className="block text-[11px] font-medium leading-[12px]">99,90</span>
          </span>
          <span className="absolute right-[9px] top-[10px] flex h-[29px] w-[33px] flex-col items-center justify-center rounded-lg bg-[#80d086] text-center text-[9px] leading-[10px] text-[#15611b]">
            <b className="block text-[13px] leading-[14px]">95%</b>
            match
          </span>
          <span className="absolute left-[42px] top-[43px] w-[71px] truncate text-[10px] font-medium leading-[10px] text-white">
            Casa Zona Sul
          </span>
        </button>
        <div className="absolute left-[115px] top-[134px] h-[57px] w-[139px] rounded-[10px] bg-[#5529bc] text-white">
          <img src={`${A}/b46fc.svg`} className="absolute left-1 top-2" alt="" />
          <span className="absolute left-10 top-1 text-[11px]">
            <b className="block text-[13px]">R$</b>680,99
          </span>
          <small className="absolute left-10 top-9 text-[10px]">Apto. Stúdio</small>
          <span className="absolute right-1 top-1 rounded-md bg-[#918bf0] px-1.5 py-1 text-[9px] font-bold text-[#251373]">
            À VENDA
          </span>
        </div>
        <img
          src={`${A}/8abb5.svg`}
          className="pointer-events-none absolute left-[140px] top-[241px]"
          alt="Sua localização"
          draggable={false}
        />
      </div>
      <button
        type="button"
        onClick={() => go("roommate")}
        aria-label="Voltar"
        className="absolute left-[17px] top-[19px] z-10 size-10"
      >
        <img src={`${A}/eab62.svg`} alt="" />
      </button>
      <button
        type="button"
        aria-label="Pesquisar no mapa"
        className="absolute right-[17px] top-[19px] z-10 size-[42px]"
      >
        <img src={`${A}/f2fd3.svg`} alt="" />
      </button>
      <div className="absolute right-[17px] top-[72px] z-10 flex flex-col overflow-hidden rounded-[10px] border border-black/40 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => changeZoom(mapZoom + 0.25)}
          disabled={mapZoom >= 2}
          aria-label="Aumentar zoom"
          className="grid size-10 place-items-center border-b border-black/15 text-2xl disabled:opacity-30"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => changeZoom(mapZoom - 0.25)}
          disabled={mapZoom <= 1}
          aria-label="Diminuir zoom"
          className="grid size-10 place-items-center text-2xl disabled:opacity-30"
        >
          −
        </button>
      </div>
      {!selected ? (
        <div className="absolute inset-x-2 bottom-7 rounded-[10px] border border-black/50 bg-white px-4 py-8">
          <label className="flex items-center gap-3 text-sm font-semibold">
            <span className="shrink-0">Ponto de referência:</span>
            <select
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              aria-label="Ponto de referência"
              className="min-w-0 flex-1 appearance-none truncate rounded-full bg-[#e7e2e9] px-3 py-0.5 text-xs font-semibold outline-none"
            >
              <option>Instituto Metrópole Digital...</option>
              <option>Estação Paulista do Metrô</option>
              <option>Hospital Infantil Sabará</option>
            </select>
          </label>
          <div className="mt-6 flex items-center gap-4">
            <span className="shrink-0 text-sm font-semibold">Orçamento mensal:</span>
            <div className="relative h-8 flex-1">
              <div className="absolute left-0 right-0 top-[19px] h-px bg-black/70" />
              <div
                className="absolute top-[18px] h-[3px] bg-[#bc90c7]"
                style={{ left: `${minPosition}%`, right: `${100 - maxPosition}%` }}
              />
              <span
                className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold"
                style={{ left: `${minPosition}%` }}
              >
                R$ {minBudget}
              </span>
              <span
                className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold"
                style={{ left: `${maxPosition}%` }}
              >
                R$ {maxBudget}
              </span>
              <input
                type="range"
                min={budgetMin}
                max={budgetMax}
                step="50"
                value={minBudget}
                onChange={(event) =>
                  setMinBudget(Math.min(Number(event.target.value), maxBudget - 50))
                }
                aria-label="Orçamento mínimo"
                className="map-range"
              />
              <input
                type="range"
                min={budgetMin}
                max={budgetMax}
                step="50"
                value={maxBudget}
                onChange={(event) =>
                  setMaxBudget(Math.max(Number(event.target.value), minBudget + 50))
                }
                aria-label="Orçamento máximo"
                className="map-range"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-2 bottom-5 rounded-[10px] border border-black/50 bg-white p-2">
          <div className="mx-auto mb-3 h-[3px] w-[121px] rounded-full bg-[#aaa]" />
          <div className="flex gap-2">
            <div className="w-[123px] shrink-0">
              <img
                src={`${A}/f2a6e.png`}
                className="h-[105px] w-full rounded-2xl object-cover"
                alt=""
              />
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold">
                <img src={`${A}/34993.png`} className="size-8 rounded-[10px] object-cover" alt="" />
                <span>
                  Lucas Damasceno
                  <small className="block font-normal text-[#646464]">Medicina, 29 anos</small>
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <h2 className="text-[13px] font-semibold leading-tight">
                  Casa Zona Sul - quarto livre
                </h2>
                <p className="text-right text-sm font-semibold">
                  R$ 99,90
                  <small className="block text-[9px] font-normal text-[#646464]">/mês</small>
                </p>
              </div>
              <p className="mt-1 border-b pb-2 text-[10px] text-[#656565]">
                ⌾ Ponta Negra, xxx km da UFRN
              </p>
              <p className="mt-2 text-[10px] text-[#656565]">Regras do imóvel</p>
              <div className="mt-1 flex gap-1 text-[10px]">
                <span className="rounded-full bg-[#e7e2e9] px-1">Sem fumantes</span>
                <span className="rounded-full bg-[#e7e2e9] px-1">Sem pets</span>
              </div>
              <div className="mt-3 flex gap-5">
                <button
                  className="rounded-md bg-[#dedede] px-3 py-1 text-sm"
                  onClick={() => go("property-roommate")}
                >
                  Ver detalhes
                </button>
                <button className="rounded-md bg-[#dedede] px-3 py-1 text-sm" onClick={() => go("chat")}>Conversar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PropertyDetail({
  onBack,
  onConfirm,
  kind,
}: {
  onBack: () => void;
  onConfirm: () => void;
  kind: "roommate" | "rental";
}) {
  const [confirming, setConfirming] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const isRental = kind === "rental";
  const propertyName = isRental ? "Casa comercial" : "Condomínio RedeMais";
  const hostName = isRental ? "Marcos Carvalho" : "Gabriel Sousa";
  const propertyPhotos = [
    { src: `${A}/f2a6e.png`, alt: `Sala de ${propertyName}` },
    { src: `${A}/apartment-living-room.jpg`, alt: `Segunda sala de ${propertyName}` },
    { src: `${A}/apartment-bedroom.jpg`, alt: `Quarto de ${propertyName}` },
  ];
  return (
    <main className="relative min-h-dvh bg-white px-[18px] pb-7 pt-[19px]">
      <header className="flex items-center justify-between">
        <button className="h-10 w-8" onClick={onBack} aria-label="Voltar">
          <img src={`${A}/07da0.svg`} alt="Voltar" />
        </button>
        <div className="flex items-center gap-1.5">
          <img src={`${A}/e15ce.svg`} className="h-[31px] w-[33px]" alt="" />
          <span className="font-jost text-[15px] font-black text-[#7501dd]">APTO</span>
        </div>
      </header>
      <h1 className="mt-2 text-xl tracking-normal">{propertyName}</h1>
      <p className="mt-2 text-sm font-semibold">{isRental ? "R$ 1.500 de aluguel por mês" : "R$ 200 por mês"}</p>
      <img
        key={propertyPhotos[photoIndex].src}
        src={propertyPhotos[photoIndex].src}
        className="mt-4 h-[154px] w-full animate-[fade-in_.2s_ease-out] object-cover"
        alt={propertyPhotos[photoIndex].alt}
      />
      <div className="mt-1 flex justify-center gap-3">
        {propertyPhotos.map((photo, index) => (
          <button
            type="button"
            key={photo.src}
            onClick={() => setPhotoIndex(index)}
            aria-label={`Visualizar foto ${index + 1} de ${propertyPhotos.length}`}
            aria-current={photoIndex === index ? "true" : undefined}
            className={`size-3 rounded-full transition-transform active:scale-75 ${photoIndex === index ? "bg-[#a100ff]" : "bg-[#e7e2e9]"}`}
          />
        ))}
      </div>
      <div className="mt-3 text-[13px]">
        <p>Principais informações do imóvel:</p>
        <ul className="list-inside list-disc">
          <li>Área: 65 m²</li>
          <li>Quartos: 2</li>
          <li>Banheiros: 1</li>
          <li>Vagas de garagem: 1</li>
          <li>Andar: 5º andar</li>
        </ul>
      </div>
      <section className="mt-7">
        <h2 className="text-xl font-semibold">Localização</h2>
        <p className="mt-3 text-[11px] leading-snug text-[#333]">
          O imóvel está localizado no bairro de Lagoa Nova, em Natal – RN, em uma região tranquila e de fácil acesso. Fica próximo a supermercados, universidades, farmácias e pontos de ônibus, facilitando a rotina dos moradores.
        </p>
      </section>
      {isRental && (
        <section className="mt-7">
          <h2 className="text-xl font-semibold">Valores e custos</h2>
          <ul className="mt-3 list-inside list-disc text-[11px] leading-snug">
            <li>Aluguel: R$ 1.500,00/mês</li>
            <li>Condomínio: R$ 350,00/mês</li>
            <li>IPTU: R$ 80,00/mês</li>
            <li>Água, energia e gás: pagos à parte, conforme consumo.</li>
            <li>Garantia locatícia: caução equivalente a dois meses de aluguel.</li>
          </ul>
        </section>
      )}
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sobre o anfitrião</h2>
          {!isRental && <span className="rounded-full bg-[#0ca719] px-3 py-1 text-[10px] text-white">90% de compatibilidade</span>}
        </div>
        <div className="mt-2 flex gap-3">
          <div className="flex-1 space-y-3 text-[11px] leading-tight">
            {isRental ? (
              <>
                <p>Olá! Meu nome é Marcos Carvalho e sou locador de um apartamento que prezo por manter em boas condições, com organização, tranquilidade e conforto para os moradores.</p>
                <p>Busco pessoas responsáveis, cuidadosas e respeitosas, que valorizem a boa convivência e zelem pelo imóvel. Espero que os moradores mantenham os ambientes limpos e organizados, respeitem as regras do apartamento e contribuam para um ambiente harmonioso.</p>
              </>
            ) : (
              <>
                <p>Olá! Meu nome é Gabriel Sousa e estou procurando um colega para dividir o apartamento comigo.</p>
                <p>Sou uma pessoa tranquila e valorizo bastante um ambiente silencioso e organizado. Procuro alguém que não fume, não tenha pets e que respeite um ambiente mais reservado. Não são permitidas festas ou eventos no apartamento, pois prefiro manter a casa calma e confortável para todos.</p>
              </>
            )}
          </div>
          <div className="w-[90px] shrink-0 text-center">
            <img
              src={`${A}/${isRental ? "49c93" : "30150"}.png`}
              className="mx-auto h-[84px] w-[81px] rounded-full object-cover"
              alt={hostName}
            />
            <b className="text-sm">{hostName}</b>
          </div>
        </div>
        {!isRental && <p className="mt-3 text-[11px] leading-tight">Busco alguém responsável, que respeite os espaços compartilhados e contribua para manter uma boa convivência no dia a dia.</p>}
      </section>
      {!isRental && <section className="mt-8">
        <h2 className="text-xl font-semibold">Características em comum</h2>
        <div className="mt-4 flex gap-1 text-sm">
          <span className="rounded-full bg-[#e7e2e9] px-1">Sem fumantes</span>
          <span className="rounded-full bg-[#e7e2e9] px-1">Sem pets</span>
          <span className="rounded-full bg-[#e7e2e9] px-1">Dormir cedo</span>
        </div>
      </section>}
      {!isRental && <section className="mt-7">
        <h2 className="text-xl font-semibold">Diferenças entre perfis</h2>
        <table className="mt-4 w-full text-center text-[10px]">
          <thead className="font-semibold">
            <tr>
              <th />
              <th>Curso</th>
              <th>Possui carro</th>
              <th>Trabalha</th>
              <th>Bebe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="py-3 text-left text-xs">Gabriel</th>
              <td>Matemática</td>
              <td>Sim</td>
              <td>Sim</td>
              <td>Sim</td>
            </tr>
            <tr>
              <th className="text-left text-xs">Você</th>
              <td>TI</td>
              <td>Não</td>
              <td>Não</td>
              <td>Não</td>
            </tr>
          </tbody>
        </table>
      </section>}
      <button
        className="primary-btn mx-auto mt-9 !h-[47px] !w-[269px] !text-2xl !font-normal"
        onClick={() => setConfirming(true)}
      >
        Tenho interesse
      </button>
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161219]/45 px-6">
          <div className="w-full max-w-[344px] rounded-[20px] bg-white p-6">
            <h2 className="text-xl font-semibold">Confirmar interesse?</h2>
            <p className="mt-4 text-sm leading-6 text-[#655e69]">
              {isRental ? `Você quer demonstrar interesse em alugar ${propertyName}?` : `Você quer demonstrar interesse em dividir este apartamento com ${hostName}?`}
            </p>
            <button className="primary-btn mt-5 !h-12 !text-sm" onClick={onConfirm}>
              Confirmar interesse
            </button>
            <button
              className="mt-2 h-12 w-full rounded-full bg-[#f8f0fc] text-sm font-semibold text-[#a100ff]"
              onClick={() => setConfirming(false)}
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

type ProposalStatus = "Pendente" | "Em andamento" | "Concluída";

function ProposalCard({ status, onChat }: { status: ProposalStatus; onChat: () => void }) {
  const color =
    status === "Pendente" ? "#eab310" : status === "Em andamento" ? "#25a8e0" : "#089443";
  return (
    <article className="flex h-[116px] overflow-hidden rounded-[10px] border border-black/50">
      <img src={`${A}/f2a6e.png`} className="w-[158px] object-cover" alt="Condomínio de luxo" />
      <div className="flex flex-1 flex-col items-end justify-between px-2 py-4">
        <span
          className="rounded-full px-3 py-1 text-[10px] text-white"
          style={{ backgroundColor: color }}
        >
          {status}
        </span>
        <h2 className="text-[15px] font-medium">Condominínio de luxo</h2>
        {status === "Em andamento" ? (
          <ConversationButton label="Conversar com anfitriã" onClick={onChat} />
        ) : (
          <span className="flex items-center gap-1 text-xs">
            <img src={`${A}/36039.png`} className="size-[15px] rounded-full" alt="" />
            Gabriel Sousa
          </span>
        )}
      </div>
    </article>
  );
}

function Proposals({
  go,
  openChat,
  interestSubmitted,
}: {
  go: (screen: Screen) => void;
  openChat: (partner: ChatPartner, contactName?: string) => void;
  interestSubmitted: boolean;
}) {
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const statuses: ProposalStatus[] = interestSubmitted
    ? ["Pendente", "Em andamento", "Concluída", "Concluída"]
    : ["Em andamento", "Concluída", "Concluída"];
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <Header go={go} logoAsset="c5b05.svg" />
      <div className="flex-1 px-[18px]">
        <p className="text-[13px] font-semibold">
          Acompanhe o andamento para ter um colega de quarto!
        </p>
        <div className="mt-3 flex h-5 text-xs">
          <button
            onClick={() => setTab("sent")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full ${tab === "sent" ? "bg-[#bc90c7]" : "bg-[#e7e2e9]"}`}
          >
            Solicitações realizadas{" "}
            <b className="rounded-full bg-white/30 px-1.5">{statuses.length}</b>
          </button>
          <button
            onClick={() => setTab("received")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full ${tab === "received" ? "bg-[#bc90c7]" : "bg-[#e7e2e9]"}`}
          >
            Solicitações recebidas <b className="rounded-full bg-black/10 px-1.5">0</b>
          </button>
        </div>
        {tab === "sent" ? (
          <div className="mt-5 space-y-6 pb-8">
            {statuses.map((status, index) => (
              <ProposalCard key={`${status}-${index}`} status={status} onChat={() => openChat("host", "Ana Beatriz")} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[520px] place-items-center text-center text-sm text-[#655e69]">
            <p>Você ainda não recebeu solicitações.</p>
          </div>
        )}
      </div>
      <BottomNav active="proposals" go={go} />
    </main>
  );
}

function TenantBusiness({ go, openChat }: { go: (screen: Screen) => void; openChat: (partner: ChatPartner, contactName?: string) => void }) {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <Header go={go} />
      <div className="flex-1 px-[18px]">
        <p className="text-[13px] font-semibold">Acompanhe o andamento do seu aluguel.</p>
        <article className="mt-5 flex h-[116px] overflow-hidden rounded-[10px] border border-black/50">
          <img src={`${A}/f2a6e.png`} className="w-[158px] object-cover" alt="Condomínio de luxo" />
          <div className="flex flex-1 flex-col items-end justify-between px-2 py-4">
            <span className="rounded-full bg-[#25a8e0] px-3 py-1 text-[10px] text-white">Em andamento</span>
            <h2 className="text-[15px] font-medium">Condomínio de luxo</h2>
            <ConversationButton label="Conversar com locador" onClick={() => openChat("landlord", "João Azevedo")} />
          </div>
        </article>
      </div>
      <BottomNav active="tenant-business" go={go} />
    </main>
  );
}

type HostProperty = {
  id: number;
  name: string;
  address: string;
  area: string;
  rooms: string;
  bathrooms: string;
  garage: string;
  floor: string;
  price: string;
  image: string;
};

function HostNav({
  go,
  active,
}: {
  go: (screen: Screen) => void;
  active: "roommate" | "requests";
}) {
  const items = [
    ["09331.svg", "Home", "home"],
    ["5fd9e.svg", "Proposta", "host-requests"],
    ["99271.svg", "Colega\nde quarto", "host-offer"],
    ["61c46.svg", "Negócios", "landlord-business"],
    ["97e6d.svg", "Conta", "profile"],
  ] as const;
  return (
    <nav className="sticky bottom-0 z-20 flex h-24 items-center justify-between bg-[#e4b5ef] px-4 py-3">
      {items.map(([icon, label, destination]) => {
        const selected =
          (active === "roommate" && destination === "host-offer") ||
          (active === "requests" && destination === "host-requests");
        return (
          <button
            key={label}
            onClick={() => go(destination as Screen)}
            className={`flex size-[61px] flex-col items-center justify-center gap-2 rounded-full text-[9px] ${selected ? "bg-[#bc90c7]" : ""}`}
          >
            <img src={`${A}/${icon}`} className="h-6 w-6 object-contain" alt="" />
            <span className="whitespace-pre-line leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function HostOffer({
  go,
  properties,
}: {
  go: (screen: Screen) => void;
  properties: HostProperty[];
}) {
  const { role } = useContext(RoleContext);
  const hostProfile = role === "Anfitrião";
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <Header go={go} logoAsset="c5b05.svg" />
      <div className="flex-1 px-[18px]">
        <div className="flex h-[21px] overflow-hidden rounded-full bg-[#e7e2e9] text-sm">
          <button
            type="button"
            onClick={() => !hostProfile && go("roommate")}
            disabled={hostProfile}
            aria-disabled={hostProfile}
            className={`flex-1 ${hostProfile ? "cursor-not-allowed text-[#9d96a1]" : ""}`}
          >
            Buscar casa
          </button>
          <button className="flex-1 rounded-full bg-[#bc90c7]">Oferecer vaga</button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <h1 className="text-sm tracking-normal">Escolha seu imóvel</h1>
          <button
            onClick={() => go("host-add-property")}
            className="rounded-full bg-[#a100ff] px-3 py-1 text-[10px] text-white"
          >
            ＋ Adicionar imóvel
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {properties.map((property) => (
            <article
              key={property.id}
              className="flex h-[116px] overflow-hidden rounded-[10px] border border-black/50"
            >
              <img src={property.image} className="w-[126px] object-cover" alt={property.name} />
              <div className="flex flex-1 flex-col justify-between p-3">
                <h2 className="text-[15px] font-medium">{property.name}</h2>
                <p className="text-sm font-semibold">{property.price} por mês</p>
                <button
                  onClick={() => go("host-candidates")}
                  className="ml-auto rounded-full bg-[#089443] px-3 py-1 text-[10px] text-white"
                >
                  Visualizar colegas de quarto
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <BottomNav active="host-offer" go={go} />
    </main>
  );
}

function HostAddProperty({
  go,
  onAdd,
}: {
  go: (screen: Screen) => void;
  onAdd: (property: HostProperty) => void;
}) {
  const [success, setSuccess] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [property, setProperty] = useState({
    name: "Condomínio Inova",
    address: "Rua das Flores, 120 - Centro",
    area: "65",
    rooms: "2",
    bathrooms: "1",
    garage: "1",
    floor: "5º andar",
    price: "R$ 300,00",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAdd({
      id: Date.now(),
      ...property,
      image: photoUrl || `${A}/d60af.png`,
    });
    setSuccess(true);
  };
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <div className="flex-1 px-[18px] pb-5 pt-5">
        <header className="flex h-[34px] items-center justify-between">
          <Logo compact />
          <button type="button" onClick={() => go("chat-history")} aria-label="Abrir histórico de conversas" className="grid size-10 place-items-center rounded-full hover:bg-[#f4e9fb]">
            <img src={`${A}/c3608.svg`} className="size-6" alt="" />
          </button>
        </header>
        <button onClick={() => go("host-offer")} className="mt-2 text-xl font-semibold">
          ‹　Adicionar imóvel
        </button>
        <p className="mt-2 text-xs text-[#706a73]">Cadastre seu imóvel para oferecer uma vaga.</p>
        <form onSubmit={submit} className="host-property-form mt-6 space-y-4">
          <h2 className="text-sm font-semibold">Sobre o imóvel</h2>
          <label className="field">
            <span>Nome do imóvel</span>
            <input
              required
              value={property.name}
              onChange={(e) => setProperty({ ...property, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Endereço</span>
            <input
              required
              value={property.address}
              onChange={(e) => setProperty({ ...property, address: e.target.value })}
            />
          </label>
          <h2 className="pt-2 text-sm font-semibold">Características do imóvel</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              <span>Área</span>
              <input
                required
                value={property.area}
                onChange={(e) => setProperty({ ...property, area: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Quartos</span>
              <input
                required
                value={property.rooms}
                onChange={(e) => setProperty({ ...property, rooms: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Banheiros</span>
              <input
                required
                value={property.bathrooms}
                onChange={(e) => setProperty({ ...property, bathrooms: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Vagas de garagem</span>
              <input
                required
                value={property.garage}
                onChange={(e) => setProperty({ ...property, garage: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span>Andar</span>
            <select
              value={property.floor}
              onChange={(e) => setProperty({ ...property, floor: e.target.value })}
            >
              <option>5º andar</option>
              <option>4º andar</option>
              <option>Térreo</option>
            </select>
          </label>
          <label className="field">
            <span>Preço mensal</span>
            <input
              required
              value={property.price}
              onChange={(e) => setProperty({ ...property, price: e.target.value })}
            />
          </label>
          <div>
            <div className="flex justify-between">
              <h2 className="text-sm font-semibold">Fotos do imóvel</h2>
              <span className="text-xs text-[#706a73]">Opcional</span>
            </div>
            <p className="mt-1 text-xs text-[#706a73]">
              Mostre os cômodos e os espaços compartilhados.
            </p>
          </div>
          <label className="flex h-[90px] cursor-pointer items-center justify-between rounded-[10px] border border-dashed border-[#c36cf1] bg-[#fbf3ff] px-5 text-xs text-[#7501dd]">
            <span>
              ▣　Adicionar fotos
              <small className="block text-[9px] text-[#706a73]">JPG ou PNG · Até 10 fotos</small>
            </span>
            <b className="text-xl">＋</b>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPhotoUrl(URL.createObjectURL(file));
              }}
            />
          </label>
          {photoUrl && (
            <img
              src={photoUrl}
              className="h-28 w-full rounded-[10px] object-cover"
              alt="Prévia do imóvel"
            />
          )}
          <button className="primary-btn">＋　Adicionar imóvel</button>
          <p className="text-center text-[10px] text-[#706a73]">
            Depois, você poderá configurar a vaga.
          </p>
        </form>
      </div>
      <BottomNav active="host-offer" go={go} />
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161219]/45 px-6">
          <div className="w-full rounded-[16px] bg-white p-6 text-center shadow-xl">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#f5e6ff] text-3xl text-[#7501dd]">
              ✓
            </span>
            <h2 className="mt-4 text-xl font-semibold">
              Imóvel adicionado
              <br />
              com sucesso
            </h2>
            <p className="mt-3 text-sm text-[#706a73]">
              Tudo pronto! Agora você pode continuar para configurar sua vaga.
            </p>
            <div className="mt-5 rounded-[10px] border border-[#ddd7e2] bg-[#fcfbfd] p-3 text-left">
              <b>{property.name}</b>
              <p className="mt-1 text-xs text-[#706a73]">{property.address}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                <span>⌁　{property.area} m²</span>
                <span>▱　{property.rooms} quartos</span>
                <span>▰　{property.bathrooms} banheiro</span>
                <span>▥　{property.floor}</span>
                <span>▣　{property.garage} vaga</span>
                <span>▤　{property.price}/mês</span>
              </div>
            </div>
            <button onClick={() => go("host-offer")} className="primary-btn mt-5">
              Continuar para a vaga　→
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function HostCandidates({ go }: { go: (screen: Screen) => void }) {
  const candidates = [
    {
      name: "Bruno Santos",
      course: "Ciência da Computação",
      match: "90%",
      color: "#0ca719",
      image: `${A}/d1007.png`,
      interactive: true,
    },
    {
      name: "Jonas Carvalho",
      course: "Farmácia",
      match: "75%",
      color: "#99b200",
      image: `${A}/9936f.png`,
      interactive: false,
    },
  ];
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <div className="flex-1 px-[18px] pt-5">
        <header className="flex items-center gap-3">
          <button onClick={() => go("host-offer")} className="text-3xl font-light">
            ‹
          </button>
          <h1 className="text-base tracking-normal">Meus imóveis</h1>
        </header>
        <div className="mt-5 flex h-[59px] items-center gap-7 rounded-[10px] border border-[#e7e2e9] bg-[#fcfbfd] px-4">
          <span className="grid size-10 place-items-center rounded-xl bg-[#652296]">
            <img src={`${A}/b5f56.svg`} alt="" />
          </span>
          <div className="text-[10px]">
            <span className="block text-[8px]">Vaga em:</span>
            <b className="block text-xs text-[#4e1e79]">Condomínio RedeMais</b>
            <span>R$ 200 por mês</span>
          </div>
        </div>
        <h2 className="mt-6 text-sm font-semibold">Perfis para a vaga</h2>
        <div className="mt-4 space-y-6">
          {candidates.map((candidate) => {
            const content = (
              <>
                <div className="flex h-[116px] border-b border-black/50">
                  <img
                    src={candidate.image}
                    className="w-[137px] object-cover object-top"
                    alt={candidate.name}
                  />
                  <div className="flex flex-1 flex-col justify-center px-7">
                    <span
                      className="whitespace-nowrap rounded-full px-3 py-1 text-center text-sm text-white"
                      style={{ backgroundColor: candidate.color }}
                    >
                      {candidate.match} de compatibilidade
                    </span>
                    <b className="mt-2 text-lg">{candidate.name}</b>
                    <strong className="mt-1 text-base">{candidate.course}</strong>
                  </div>
                </div>
                <div className="h-[98px] px-4 py-5 text-left">
                  <b className="text-sm">Por que vocês combinam</b>
                  <div className="mt-5 flex gap-1 text-[10px]">
                    <span className="rounded-full bg-[#e7e2e9] px-1.5 py-0.5">Sem fumantes</span>
                    <span className="rounded-full bg-[#e7e2e9] px-1.5 py-0.5">Sem pets</span>
                    <span className="rounded-full bg-[#e7e2e9] px-1.5 py-0.5">Dormir cedo</span>
                  </div>
                </div>
              </>
            );
            return candidate.interactive ? (
              <button
                key={candidate.name}
                onClick={() => go("host-profile")}
                className="w-full overflow-hidden rounded-[10px] border border-black/50 text-left"
              >
                {content}
              </button>
            ) : (
              <article
                key={candidate.name}
                className="overflow-hidden rounded-[10px] border border-black/50"
              >
                {content}
              </article>
            );
          })}
        </div>
      </div>
      <BottomNav active="roommate" go={go} />
    </main>
  );
}

const compatibilityRows = [
  ["a4910.svg", "Gênero", "Não informado"],
  ["4607a.svg", "Idade", "Não informado"],
  ["b1d11.svg", "Fuma", "Não"],
  ["1c2c9.svg", "Ingere bebidas alcoólicas", "Não informado"],
  ["d2c58.svg", "Trabalha", "Não informado"],
  ["8845d.svg", "Possui carro", "Não informado"],
  ["ac6d5.svg", "Possui pets", "Não"],
  ["78ef3.svg", "Horário de dormir", "Cedo"],
  ["a96bd.svg", "Na faculdade", "Sim"],
  ["1eb91.svg", "Curso", "Ciência da Computação"],
  ["cbd14.svg", "Em algum relacionamento", "Não informado"],
  ["14c60.svg", "Recebe visitas frequentes", "Não informado"],
];

function HostCandidateProfile({ go }: { go: (screen: Screen) => void }) {
  return (
    <main className="min-h-dvh bg-white px-[13px] py-5">
      <header className="flex items-center justify-between">
        <button onClick={() => go("host-candidates")} className="text-sm">
          ‹　Perfil do colega
        </button>
        <div className="flex items-center gap-1">
          <img src={`${A}/459f8.svg`} alt="" />
          <span className="font-jost text-[15px] font-black text-[#7501dd]">APTO</span>
        </div>
      </header>
      <img
        src={`${A}/d1007.png`}
        className="mt-5 h-[268px] w-full rounded-[10px] object-cover object-top"
        alt="Bruno Santos"
      />
      <h1 className="mt-4 text-xl tracking-normal">Bruno Santos</h1>
      <p className="mt-1 text-xs text-[#706a73]">Ciência da Computação</p>
      <span className="mt-4 inline-block rounded-full bg-[#0ca719] px-3 py-1 text-[10px] text-white">
        90% de compatibilidade
      </span>
      <section className="mt-5 border-y border-[#e7e2e9] py-5">
        <h2 className="font-semibold">Características em comum</h2>
        <div className="mt-3 flex gap-1 text-[10px]">
          <span className="rounded-full bg-[#e7e2e9] px-2 py-1">Sem fumantes</span>
          <span className="rounded-full bg-[#e7e2e9] px-2 py-1">Sem pets</span>
          <span className="rounded-full bg-[#e7e2e9] px-2 py-1">Dormir cedo</span>
        </div>
      </section>
      <section className="mt-5">
        <h2 className="font-semibold">Perfil de compatibilidade</h2>
        <div className="mt-3">
          {compatibilityRows.map(([icon, label, value]) => (
            <div
              key={label}
              className="flex justify-between border-b border-[#e7e2e9] py-3 text-[11px]"
            >
              <span className="flex items-center gap-2 text-[#706a73]">
                <img src={`${A}/${icon}`} alt="" />
                {label}
              </span>
              <span
                className={
                  value === "Não" || value === "Sim"
                    ? "rounded-full bg-green-100 px-2 text-green-700"
                    : ""
                }
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function HostRequests({
  go,
  accepted,
  onAccept,
}: {
  go: (screen: Screen) => void;
  accepted: boolean;
  onAccept: () => void;
}) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const accept = () => {
    onAccept();
    setShowSuccess(true);
  };
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <Header go={go} logoAsset="c5b05.svg" />
      <div className="flex-1 px-[18px]">
        <p className="text-[13px] font-semibold">
          Acompanhe o andamento para ter um colega de quarto!
        </p>
        <div className="mt-3 flex h-5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("sent")}
            aria-pressed={tab === "sent"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full ${tab === "sent" ? "bg-[#bc90c7]" : "bg-[#e7e2e9]"}`}
          >
            Solicitações realizadas <b className="font-normal">0</b>
          </button>
          <button
            type="button"
            onClick={() => setTab("received")}
            aria-pressed={tab === "received"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full ${tab === "received" ? "bg-[#bc90c7]" : "bg-[#e7e2e9]"}`}
          >
            Solicitações recebidas <b className="font-normal">1</b>
          </button>
        </div>
        {tab === "sent" ? (
          <p className="mt-8 py-10 text-center text-sm text-[#706a73]">Você ainda não tem solicitações realizadas.</p>
        ) : <article className="mt-5 flex h-[124px] overflow-hidden rounded-[10px] border border-black/50">
          <div className="relative w-[35%] shrink-0">
            <img src={`${A}/f2a6e.png`} className="h-full w-full object-cover" alt="" />
            <span
              className={`absolute left-3 top-3 rounded-full px-4 py-1 text-xs font-medium text-white ${accepted ? "bg-[#7501dd]" : "bg-[#eab310]"}`}
            >
              {accepted ? "Aceita" : "Pendente"}
            </span>
          </div>
          <div className="flex flex-1 flex-col items-end justify-between px-3 py-3">
            <h2 className="w-full truncate text-right text-base font-medium">Condomínio RedeMais</h2>
            <span className="flex max-w-full min-w-0 items-center justify-end gap-1 text-[13px]">
              <span className="shrink-0">Colega de quarto:</span>
              <img src={`${A}/36039.png`} className="size-4 shrink-0 rounded-full" alt="" />
              <span className="min-w-0 truncate">Gabriel Sousa</span>
            </span>
            {accepted ? (
              <span className="rounded-full bg-[#e7d5ef] px-3 py-1 text-xs text-[#7501dd]">
                Solicitação aceita
              </span>
            ) : (
              <button
                onClick={accept}
                className="rounded-full bg-[#089443] px-4 py-1.5 text-xs font-medium text-white"
              >
                Aceitar solicitação
              </button>
            )}
          </div>
        </article>}
      </div>
      <BottomNav active="host-requests" go={go} />
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161219]/45 px-6">
          <div className="w-full rounded-[16px] bg-white p-6 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#f5e6ff] text-3xl text-[#7501dd]">
              ✓
            </span>
            <h2 className="mt-5 text-2xl font-semibold">Solicitação aceita!</h2>
            <p className="mt-3 text-sm leading-6 text-[#706a73]">
              Você aceitou a solicitação de Gabriel Sousa para dividir o imóvel no Condomínio
              RedeMais.
            </p>
            <button onClick={() => setShowSuccess(false)} className="primary-btn mt-5">
              Entendi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function LandlordHeader({ go }: { go: (screen: Screen) => void }) {
  return (
    <header className="flex h-[60px] items-center justify-between px-[18px]">
      <Logo compact />
      <button type="button" onClick={() => go("chat-history")} aria-label="Histórico de conversas">
        <img src={`${A}/c3608.svg`} className="size-6" alt="" />
      </button>
    </header>
  );
}

const landlordNavItems = [
  ["b7a17.svg", "Home", "landlord-business"],
  ["3df6e.svg", "Proposta", "landlord-business"],
  ["73432.svg", "Negócios", "landlord-business"],
  ["4f18a.svg", "Conta", "landlord-profile"],
] as const;

function LandlordNav({ go }: { go: (screen: Screen) => void }) {
  return (
    <nav className="sticky bottom-0 z-20 flex h-24 items-center justify-between bg-[#e4b5ef] px-5 py-3">
      {landlordNavItems.map(([icon, label, destination]) => (
        <button
          key={label}
          type="button"
          onClick={() => go(destination as Screen)}
          className={`flex size-[61px] flex-col items-center justify-center gap-2 rounded-full text-[9px] ${label === "Negócios" ? "bg-[#bc90c7]" : ""}`}
        >
          <img src={`${A}/${icon}`} className="h-6 w-6 object-contain" alt="" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function ConfirmDialog({
  title,
  description,
  helper,
  confirmLabel,
  confirmColor,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  helper?: string;
  confirmLabel: string;
  confirmColor: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161219]/45 px-6">
      <div className="w-full max-w-[344px] rounded-[20px] bg-white p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#655e69]">{description}</p>
        {helper && <p className="mt-1 text-xs leading-5 text-[#857d8b]">{helper}</p>}
        <button
          type="button"
          className="mt-4 h-12 w-full rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: confirmColor }}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className="mt-2 h-12 w-full rounded-full border border-[#ddd7e2] text-sm font-semibold text-[#3b3939]"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

type LandlordDealStatus = "Pendente" | "Em andamento" | "Concluída";

function LandlordDealCard({
  status,
  onAccept,
  onRemove,
  onChat,
}: {
  status: LandlordDealStatus;
  onAccept: () => void;
  onRemove: () => void;
  onChat: () => void;
}) {
  const color =
    status === "Pendente" ? "#eab310" : status === "Em andamento" ? "#25a8e0" : "#089443";
  return (
    <article className="flex h-[116px] overflow-hidden rounded-[10px] border border-black/50">
      <div className="relative w-[126px] shrink-0">
        <img
          src={`${A}/f2a6e.png`}
          className="h-full w-full object-cover"
          alt="Condomínio de luxo"
        />
        <span
          className="absolute left-2 top-3 rounded-full px-3 py-1 text-[10px] text-white"
          style={{ backgroundColor: color }}
        >
          {status}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-end justify-between p-3">
        <h2 className="text-[15px] font-medium">Condominínio de luxo</h2>
        <span className="flex items-center gap-1 text-xs">
          Comprador: <img src={`${A}/36039.png`} className="size-[15px] rounded-full" alt="" />{" "}
          Gabriel Sousa
        </span>
        {status === "Pendente" && (
          <button
            onClick={onAccept}
            className="rounded-full bg-[#089443] px-3 py-1 text-[10px] text-white"
          >
            Aceitar solicitação
          </button>
        )}
        {status === "Em andamento" && <ConversationButton label="Conversar com locatário" onClick={onChat} />}
        {status === "Concluída" && (
          <button
            onClick={onRemove}
            className="rounded-full bg-[#e00000] px-3 py-1 text-[10px] text-white"
          >
            Remover anúncio
          </button>
        )}
      </div>
    </article>
  );
}

function ConversationButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 min-w-[138px] items-center justify-center gap-1.5 rounded-full bg-[#a100ff] px-2.5 text-[9px] font-medium leading-none text-white hover:bg-[#8e00e5]"
    >
      <svg aria-hidden="true" className="size-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3.25h10v7.5H7l-3.25 2v-2H3z" />
        <path d="M5.5 6.25h5" />
      </svg>
      {label}
    </button>
  );
}

function PropertyManagementCard({
  second = false,
  paused,
  onToggle,
  onEdit,
}: {
  second?: boolean;
  paused: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const statusLabel = second ? "Alugado" : paused ? "Pausado" : "Ativo";
  return (
    <article className="overflow-hidden rounded-[10px] border border-black/50">
      <div className="relative h-[147px]">
        <img
          src={`${A}/${second ? "5465c" : "f2a6e"}.png`}
          className="h-full w-full object-cover"
          alt={second ? "Apartamento estúdio" : "Condomínio de luxo"}
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs text-white ${statusLabel === "Pausado" ? "bg-[#706a73]" : second ? "bg-[#403bd5]" : "bg-[#089443]"}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="p-2">
        <div className="flex justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-medium">
              {second ? "Apartamento estúdio" : "Condomínio de luxo"}
            </h2>
            <p className="text-[10px]">
              {second ? "Vila Indiana, São Paulo" : "Pinheiros, São Paulo"}
            </p>
          </div>
          <p className="text-right text-sm font-semibold">
            {second ? "R$ 2.300" : "R$ 99,90"}
            <small className="block text-[9px] font-normal">/mês</small>
          </p>
        </div>
        <p className="mt-2 text-[11px] text-[#706a73]">
          {second
            ? "Studio boutique decorado, ar condicionado split, cozinha equipada e excelente localização."
            : "Design contemporâneo não mobiliado, sala em dois ambientes, sacada envidraçada de alto padrão."}
        </p>
        {!second && <div className={`mt-3 flex gap-3 pb-3 ${paused ? "justify-center" : "justify-between"}`}>
          <button
            onClick={onToggle}
            className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-white ${paused ? "w-[65%] bg-[#089443]" : "flex-1 bg-[#b98000]"}`}
          >
            <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9.5" />
              {paused ? <path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none" /> : <path d="M9 8v8m6-8v8" />}
            </svg>
            <span className="whitespace-nowrap">{paused ? "Ativar anúncio" : "Pausar anúncio"}</span>
          </button>
          {!paused && <button
            onClick={onEdit}
            className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[#572288] px-3 text-sm font-medium text-white"
          >
            <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" />
            </svg>
            <span className="whitespace-nowrap">Editar anúncio</span>
          </button>}
        </div>}
      </div>
    </article>
  );
}

function LandlordBusiness({
  go,
  openChat,
  deals,
  setDeals,
  paused,
  setPaused,
  onNewAnnouncement,
}: {
  go: (screen: Screen) => void;
  openChat: (partner: ChatPartner, contactName?: string) => void;
  deals: LandlordDealStatus[];
  setDeals: (deals: LandlordDealStatus[]) => void;
  paused: boolean[];
  setPaused: (paused: boolean[]) => void;
  onNewAnnouncement: () => void;
}) {
  const [tab, setTab] = useState<"properties" | "deals">("deals");
  const [dialog, setDialog] = useState<"accept" | "remove" | "pause" | "activate" | null>(null);
  const [selectedDeal, setSelectedDeal] = useState(0);
  const confirmDialog = () => {
    if (dialog === "accept")
      setDeals(deals.map((item, index) => (index === selectedDeal ? "Em andamento" : item)));
    if (dialog === "remove") setDeals(deals.filter((_, index) => index !== selectedDeal));
    if (dialog === "pause" || dialog === "activate")
      setPaused(paused.map((item, index) => (index === selectedDeal ? dialog === "pause" : item)));
    setDialog(null);
  };
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <LandlordHeader go={go} />
      <div className="flex-1 px-[18px]">
        <p className="text-sm font-semibold">
          {tab === "deals"
            ? "Acompanhe o andamento das suas vendas!"
            : "Gerencie seus anúncios de imóveis!"}
        </p>
        <div className="mt-4 flex h-5 text-xs">
          <button
            onClick={() => setTab("properties")}
            className={`flex flex-1 justify-center gap-2 rounded-full ${tab === "properties" ? "bg-[#bc90c7]" : "bg-[#e7e2e9]"}`}
          >
            Meus imóveis <b className="rounded-full bg-black/10 px-1.5">2</b>
          </button>
          <button
            onClick={() => setTab("deals")}
            className={`flex flex-1 justify-center gap-2 rounded-full ${tab === "deals" ? "bg-[#bc90c7]" : "bg-[#e7e2e9]"}`}
          >
            Negociações Ativas <b className="rounded-full bg-black/10 px-1.5">{deals.filter((deal) => deal === "Em andamento").length}</b>
          </button>
        </div>
        {tab === "deals" ? (
          <div className="mt-6 space-y-4 pb-8">
            {deals.map((status, index) => (
              <LandlordDealCard
                key={`${status}-${index}`}
                status={status}
                onAccept={() => {
                  setSelectedDeal(index);
                  setDialog("accept");
                }}
                onRemove={() => {
                  setSelectedDeal(index);
                  setDialog("remove");
                }}
                onChat={() => openChat("tenant", "Gabriel Sousa")}
              />
            ))}
          </div>
        ) : (
          <div className="pb-8">
            <button onClick={onNewAnnouncement} className="mt-5 flex w-full items-center justify-between rounded-[10px] border border-[#e7e2e9] bg-[#fcfbfd] p-4 text-left">
              <span className="flex items-center gap-2">
                <b className="grid size-10 place-items-center rounded-xl bg-[#652296] text-2xl text-white">
                  ⌂
                </b>
                <span>
                  <strong className="block text-[#4e1e79]">Novo anúncio</strong>
                  <small className="block text-[#474747]">
                    Cadastre um kitnet,
                    <br />
                    apartamento ou casa
                  </small>
                </span>
              </span>
              <span className="rounded-full bg-[#652296] px-4 py-2 text-white">＋ Adicionar</span>
            </button>
            <div className="mt-7 space-y-6">
              {[false, true].map((second, index) => (
                <PropertyManagementCard
                  key={String(second)}
                  second={second}
                  paused={paused[index]}
                  onToggle={() => {
                    setSelectedDeal(index);
                    setDialog(paused[index] ? "activate" : "pause");
                  }}
                  onEdit={() => go("landlord-edit")}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav active="landlord-business" go={go} />
      {dialog === "accept" && (
        <ConfirmDialog
          title="Aceitar solicitação?"
          description="Deseja aceitar a solicitação de Gabriel Sousa para este imóvel?"
          helper="Você poderá continuar a negociação pelo chat."
          confirmLabel="Sim, aceitar solicitação"
          confirmColor="#089443"
          cancelLabel="Agora não"
          onConfirm={confirmDialog}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "remove" && (
        <ConfirmDialog
          title="Remover anúncio?"
          description="Deseja remover este anúncio da sua lista de imóveis?"
          helper="Confira se selecionou o anúncio correto antes de confirmar."
          confirmLabel="Sim, remover anúncio"
          confirmColor="#e00000"
          cancelLabel="Manter anúncio"
          onConfirm={confirmDialog}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "pause" && (
        <ConfirmDialog
          title="Pausar anúncio?"
          description="O anúncio “Condomínio de luxo” ficará oculto para quem procura um imóvel."
          helper="Você poderá reativá-lo quando quiser."
          confirmLabel="Sim, pausar anúncio"
          confirmColor="#c88900"
          cancelLabel="Manter anúncio ativo"
          onConfirm={confirmDialog}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "activate" && (
        <ConfirmDialog
          title="Ativar anúncio?"
          description="O anúncio “Condomínio de luxo” ficará disponível novamente para quem procura um imóvel."
          confirmLabel="Sim, ativar anúncio"
          confirmColor="#159447"
          cancelLabel="Manter anúncio desativado"
          onConfirm={confirmDialog}
          onCancel={() => setDialog(null)}
        />
      )}
    </main>
  );
}

function LandlordEdit({ go }: { go: (screen: Screen) => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <main className="min-h-dvh bg-white px-3 pb-6 pt-4">
      <header className="flex items-center justify-between">
        <Logo compact />
        <button type="button" onClick={() => go("chat-history")} aria-label="Abrir histórico de conversas" className="grid size-10 place-items-center rounded-full hover:bg-[#f4e9fb]">
          <img src={`${A}/c3608.svg`} className="size-6" alt="" />
        </button>
      </header>
      <button className="mt-5 text-sm font-semibold" onClick={() => go("landlord-business")}>
        ‹ Editar anúncio
      </button>
      <p className="mt-2 text-[10px] text-[#706a73]">Atualize as informações do seu imóvel.</p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
          setTimeout(() => go("landlord-business"), 900);
        }}
      >
        <h2 className="text-xs font-semibold">Sobre o imóvel</h2>
        <label className="field">
          <span>Finalidade do anúncio</span>
          <select defaultValue="Alugar">
            <option>Alugar</option>
            <option>Vender</option>
          </select>
        </label>
        <label className="field">
          <span>Tipo de imóvel</span>
          <select defaultValue="Apartamento">
            <option>Apartamento</option>
            <option>Casa</option>
            <option>Kitnet</option>
          </select>
        </label>
        <label className="field">
          <span>Título do anúncio</span>
          <input defaultValue="Condomínio de luxo" />
        </label>
        <label className="field">
          <span>Endereço</span>
          <input defaultValue="Pinheiros, São Paulo" />
        </label>
        <label className="field">
          <span>Descrição</span>
          <textarea
            className="min-h-24 rounded-[10px] border border-[#ddd7e2] bg-[#fcfbfd] p-3 text-xs outline-none"
            defaultValue="Design contemporâneo não mobiliado, sala em dois ambientes, sacada envidraçada de alto padrão."
          />
        </label>
        <h2 className="pt-2 text-xs font-semibold">Características do imóvel</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="field">
            <span>Área</span>
            <input defaultValue="65 m²" />
          </label>
          <label className="field">
            <span>Quartos</span>
            <input defaultValue="2" />
          </label>
          <label className="field">
            <span>Banheiros</span>
            <input defaultValue="1" />
          </label>
          <label className="field">
            <span>Vagas de garagem</span>
            <input defaultValue="1" />
          </label>
        </div>
        <label className="field">
          <span>Andar</span>
          <select defaultValue="5º andar">
            <option>5º andar</option>
            <option>4º andar</option>
          </select>
        </label>
        <label className="field">
          <span>Valor do aluguel mensal</span>
          <input defaultValue="R$ 99,90" />
        </label>
        <h2 className="pt-2 text-xs font-semibold">Fotos do imóvel</h2>
        <img
          src={`${A}/f2a6e.png`}
          className="h-[126px] w-full rounded-[10px] object-cover"
          alt="Foto de capa do imóvel"
        />
        <label className="flex h-16 cursor-pointer items-center justify-between rounded-[10px] border border-dashed border-[#c36cf1] bg-[#fbf3ff] px-4 text-xs text-[#7501dd]">
          <span>
            ▣　Adicionar fotos
            <small className="block text-[9px] text-[#706a73]">JPG ou PNG · Até 10 fotos</small>
          </span>
          <b className="text-xl">＋</b>
          <input type="file" accept="image/png,image/jpeg" multiple className="hidden" />
        </label>
        {saved && <p className="notice text-center">Alterações salvas.</p>}
        <button className="h-12 w-full rounded-full bg-[#652296] text-sm font-semibold text-white">
          Salvar alterações
        </button>
        <button
          type="button"
          onClick={() => go("landlord-business")}
          className="h-12 w-full rounded-full border border-[#ddd7e2] text-sm"
        >
          Cancelar alterações
        </button>
      </form>
    </main>
  );
}

type ConversationRow = [string, string, string, string, ChatPartner];
const conversations: ConversationRow[] = [
  [
    "João Azevedo",
    "Você: Combinado! Amanhã às 15h. Te espero lá!",
    "08:58",
    "Locatário · Condomínio RedeMais",
    "tenant",
  ],
  [
    "Bruno Santos",
    "Enviei os documentos para a locação.",
    "08:42",
    "Anfitriã · Condomínio Inova",
    "host",
  ],
  [
    "Ana Beatriz",
    "Você: Sua visita está confirmada para sábado.",
    "Ontem",
    "Aluguel · Studio em Pinheiros",
    "host",
  ],
  [
    "Marina Oliveira",
    "Tenho interesse! Você aceita caução?",
    "Ontem",
    "Aluguel · Apartamento na Bela Vista",
    "landlord",
  ],
  [
    "Pedro Costa",
    "Você: Sim, a casa está disponível para alugar.",
    "09 nov",
    "Aluguel · Casa no Butantã",
    "tenant",
  ],
  [
    "Lucas Ferreira",
    "Posso me mudar no início do mês?",
    "07 nov",
    "Aluguel · Apartamento na Saúde",
    "landlord",
  ],
];

const joaoConversations: ConversationRow[] = [
  ["João Azevedo", "Você: Combinado! Amanhã às 15h. Te espero lá!", "08:58", "Locatário · Condomínio RedeMais", "tenant"],
  ["Bruno Santos", "Enviei os documentos para a locação.", "08:42", "Anfitriã · Condomínio Inova", "host"],
];
const hostConversations: ConversationRow[] = [
  ["Gabriel Sousa", "Você: Combinado! Amanhã às 15h. Te espero lá!", "08:58", "Colega de quarto · Condomínio RedeMais", "tenant"],
];
const landlordConversations: ConversationRow[] = [
  ["Roberto Silva", "Você: Combinado! Amanhã às 15h. Te espero lá!", "08:58", "Locatário · Condomínio RedeMais", "tenant"],
];
const tenantConversations: ConversationRow[] = [
  ["João Azevedo", "Você: Combinado! Amanhã às 15h. Te espero lá!", "08:58", "Locador · Condomínio RedeMais", "landlord"],
  ["Ana Beatriz", "Enviei os documentos para a locação.", "08:42", "Anfitriã · Condomínio Inova", "host"],
];

type ProposalData = {
  rent: number;
  condo: number;
  iptu: number;
  startDate: string;
  duration: string;
  message: string;
};

type SentDocument = {
  name: string;
  size: string;
  url: string;
};

function ChatHistory({
  go,
  openChat,
  proposal,
  document,
  backScreen,
  user,
}: {
  go: (screen: Screen) => void;
  openChat: (partner: ChatPartner, contactName?: string) => void;
  proposal: ProposalData | null;
  document: SentDocument | null;
  backScreen: Screen;
  user: MockUser | null;
}) {
  const { role } = useContext(RoleContext);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const baseConversations = user?.id === "joao-souza" || role === "Colega de quarto"
    ? joaoConversations
    : role === "Anfitrião"
      ? hostConversations
      : role === "Locador"
        ? landlordConversations
        : tenantConversations;
  const latestPreview = document
    ? `Você: Documento · ${document.name}`
    : proposal
      ? `Você: Proposta · R$ ${proposal.rent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`
      : baseConversations[0][1];
  const conversationList = baseConversations.map((item, index) =>
    index === 0
      ? [
          item[0],
          latestPreview,
          proposal || document ? (document ? "09:05" : "09:02") : item[2],
          item[3],
          item[4],
        ]
      : item,
  );
  const visible = conversationList.filter(([name, message]) =>
    `${name} ${message}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <header className="flex h-14 items-center gap-5 px-5">
        <button onClick={() => go(backScreen)} className="grid size-7 place-items-center" aria-label="Voltar">
          <svg aria-hidden="true" className="size-4" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 3-9 9 9 9" /></svg>
        </button>
        <h1 className="text-base tracking-normal">Histórico de conversas</h1>
      </header>
      <div className="px-5 pt-4">
        <h2 className="text-2xl font-semibold">{role === "Locatário" || role === "Colega de quarto" ? "Conversas" : "Interessados"}</h2>
        <p className="mt-1 text-sm text-[#706a73]">
          {role === "Anfitrião" ? "Converse com colegas de quarto interessados no seu imóvel." : role === "Locador" ? "Converse com quem quer alugar seu imóvel." : "Acompanhe as conversas com anfitriãs e locadores."}
        </p>
        <label className="mt-3 flex h-11 items-center gap-3 rounded-[10px] bg-[#ededed] px-4 text-[#857d8b]">
          ⌕
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Buscar nome ou mensagem"
          />
        </label>
        <div className="mt-3 flex gap-2">
          {[
            ["all", "Todas　6"],
            ["unread", "Não lidas　1"],
            ["archived", "Arquivadas"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as typeof filter)}
              className={`flex-1 rounded-full py-2 text-xs ${filter === value ? "bg-[#e7c1f8] text-[#4e1e79]" : "bg-[#ededed]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 bg-[#ededed] px-5 py-2 text-[9px] font-bold text-[#706a73]">
        MAIS RECENTES
      </div>
      <div className="flex-1">
        {filter === "archived" ? (
          <p className="p-8 text-center text-sm text-[#706a73]">Nenhuma conversa arquivada.</p>
        ) : (
          visible
            .slice(0, filter === "unread" ? 1 : visible.length)
            .map(([name, message, time, property, partner], index) => (
              <button
                key={name}
                onClick={() => openChat(partner as ChatPartner, name)}
                className={`w-full border-b border-[#e7e2e9] px-5 py-3 text-left ${index === 1 ? "bg-[#fbf3ff]" : ""}`}
              >
                <span className="flex justify-between">
                  <b className="text-sm">{name}</b>
                  <small className="text-[#706a73]">{time}</small>
                </span>
                <p className="mt-1 text-xs text-[#655e69]">{message}</p>
                <small className="mt-2 block text-[10px] text-[#706a73]">{property}</small>
              </button>
            ))
        )}
      </div>
      <div className="bg-[#e4b5ef] p-3">
        <button type="button" onClick={() => openChat("landlord", "João Azevedo")} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#edd5fb] text-sm text-[#4e1e79]">
          <img src={`${A}/new-conversation.png`} className="size-5 object-contain" alt="" />
          Nova conversa
        </button>
      </div>
    </main>
  );
}

function IndividualChat({
  go,
  partner,
  contactName,
  proposal,
  setProposal,
  document,
  setDocument,
}: {
  go: (screen: Screen) => void;
  partner: ChatPartner;
  contactName?: string;
  proposal: ProposalData | null;
  setProposal: (proposal: ProposalData) => void;
  document: SentDocument | null;
  setDocument: (document: SentDocument) => void;
}) {
  const partnerName = contactName ?? (partner === "host" ? "Ana Beatriz" : partner === "landlord" ? "João Azevedo" : "Roberto Silva");
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [proposalDraft, setProposalDraft] = useState<ProposalData>(
    proposal ?? {
      rent: 2200,
      condo: 350,
      iptu: 90,
      startDate: "2026-12-01",
      duration: "30 meses",
      message: `${partnerName}, segue a proposta para sua análise.`,
    },
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState(() => partner === "host"
    ? [`Olá! Tenho interesse no quarto do Condomínio RedeMais, ${partnerName}.`, `Oi! Vamos combinar uma visita?`, "Pode ser amanhã às 15h?", "Combinado! Te espero lá!"]
    : partner === "tenant"
      ? [`Olá, ${partnerName}! Vi sua solicitação para o Condomínio RedeMais.`, "Oi! Tenho interesse no imóvel.", "Podemos combinar a visita?", "Sim! Amanhã às 15h."]
      : ["Olá, João! Quer agendar uma visita ao imóvel?", "Olá! Posso visitar amanhã às 15h.", "Pode ser?", "Combinado! Amanhã às 15h. Te espero lá!"]);
  const send = () => {
    if (message.trim()) {
      setMessages([...messages, message.trim()]);
      setMessage("");
      setRecording(false);
    }
  };
  const total = proposalDraft.rent + proposalDraft.condo + proposalDraft.iptu;
  const currency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const sendProposal = (event: FormEvent) => {
    event.preventDefault();
    setProposal(proposalDraft);
    setShowProposal(false);
  };
  const uploadDocument = (file: File | undefined) => {
    if (!file) return;
    setDocument({
      name: file.name,
      url: URL.createObjectURL(file),
      size:
        file.size >= 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`,
    });
  };
  return (
    <main className="flex min-h-dvh flex-col bg-[#f1f1f1]">
      <header className="flex h-[59px] items-center gap-3 bg-white px-4">
        <button className="text-3xl" onClick={() => go("chat-history")}>
          ‹
        </button>
        <span className="relative grid size-10 place-items-center rounded-full bg-[#ddd]">
          <span className="size-5 rounded-full bg-[#171717]" />
          <i className="absolute bottom-0 right-0 size-3 rounded-full bg-[#079b44] ring-1 ring-white" />
        </span>
        <b className="flex-1">{partnerName}</b>
        <button className="text-2xl">⌕</button>
        <button className="text-2xl">⋮</button>
      </header>
      <div className="flex-1 space-y-6 px-5 py-10">
        {messages.map((text, index) => (
          <div
            key={`${text}-${index}`}
            className={`max-w-[225px] rounded-lg px-3 py-2 text-sm leading-tight ${index % 3 === 1 || index === 2 ? "mr-auto bg-[#ead0fb]" : "ml-auto bg-[#c991ed]"}`}
          >
            {text}
            <small className="ml-2 text-[9px] text-[#706a73]">
              {index < 3 ? `08:5${index + 3}` : "agora"} ✓✓
            </small>
          </div>
        ))}
        {proposal && (
          <article className="ml-auto w-[297px] rounded-xl border border-[#d59bf3] bg-[#fcf8ff] p-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#29202e]">
              <img src={`${A}/6f6cd.svg`} alt="" /> Proposta de locação
            </h3>
            <p className="mt-2 text-xs text-[#706a73]">Apartamento no Centro</p>
            <p className="mt-2 text-xl font-bold">{currency(proposal.rent)} / mês</p>
            <p className="mt-1 text-[10px] text-[#706a73]">
              Condomínio {currency(proposal.condo)} · IPTU {currency(proposal.iptu)}
            </p>
            <p className="mt-1 text-sm">
              Total mensal: {currency(proposal.rent + proposal.condo + proposal.iptu)}
            </p>
            <p className="mt-2 text-[10px] text-[#706a73]">
              {proposal.startDate.split("-").reverse().join("/")} · Contrato de {proposal.duration}
            </p>
            <div className="mt-2 flex gap-3">
              <span className="flex-1 rounded-md bg-[#ead0fb] px-2 py-1 text-[10px] text-[#6e2c95]">
                Aguardando João
              </span>
              <button
                onClick={() => setShowProposal(true)}
                className="flex-1 rounded-md bg-[#743b96] px-2 py-1 text-[10px] text-white"
              >
                Ver proposta
              </button>
            </div>
            <small className="mt-2 flex justify-between text-[9px] text-[#706a73]">
              <span>Enviada por você</span>
              <span>09:02</span>
            </small>
          </article>
        )}
        {document && (
          <article className="ml-auto w-[297px] rounded-xl border border-[#d59bf3] bg-[#fcf8ff] p-3">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <img src={`${A}/a044b.svg`} alt="" /> Documento enviado
            </h3>
            <p className="mt-3 text-sm">{document.name}</p>
            <p className="mt-1 text-[10px] text-[#706a73]">
              PDF · {document.size} · Minuta para análise
            </p>
            <div className="mt-3 flex justify-between">
              <button
                onClick={() => window.open(document.url, "_blank", "noopener,noreferrer")}
                className="text-xs font-medium text-[#743b96]"
              >
                Abrir documento
              </button>
              <small className="text-[9px] text-[#706a73]">09:05</small>
            </div>
          </article>
        )}
      </div>
      <div className="bg-[#e4b5ef] p-3">
        <div className="mb-3 flex gap-8">
          <button
            onClick={() => setShowProposal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#087844] bg-[#d6f6df] px-3 py-1 text-xs text-[#087844]"
          >
            <img aria-hidden="true" className="size-5 shrink-0 object-contain" src={`${A}/proposal-handshake.png`} alt="" />
            Fazer Proposta
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#087080] bg-[#d5f4f7] px-3 py-1 text-xs text-[#087080]"
          >
            <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="7" r="4.5" />
              <path d="M2.5 21c.3-5.2 4.1-8 9.5-8s9.2 2.8 9.5 8z" />
            </svg>
            Enviar Documento
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            onChange={(event) => uploadDocument(event.target.files?.[0])}
          />
        </div>
        <div className="flex gap-3">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={recording ? "Gravando mensagem de voz…" : "Digite uma mensagem"}
            className="h-11 flex-1 rounded-[10px] border border-[#ccc] bg-[#f1f1f1] px-4 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setRecording((current) => !current)}
            aria-label={recording ? "Parar gravação de voz" : "Gravar mensagem de voz"}
            aria-pressed={recording}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f1f1f1]"
          >
            <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2.5" width="6" height="12.5" rx="3" fill="currentColor" stroke="none" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4m-3 0h6" />
            </svg>
          </button>
        </div>
      </div>
      {showProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161219]/45 px-3 py-4">
          <form
            onSubmit={sendProposal}
            className="proposal-form max-h-[calc(100dvh-2rem)] w-full max-w-[360px] overflow-y-auto rounded-[14px] bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Fazer proposta</h2>
                <p className="mt-0.5 text-[10px] text-[#706a73]">Para {partnerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProposal(false)}
                className="text-xl leading-none text-[#706a73]"
              >
                ×
              </button>
            </div>
            <div className="mt-3 rounded-[9px] bg-[#f3e7fa] px-2.5 py-2">
              <b className="text-xs">Apartamento no Centro</b>
              <small className="block text-[9px] text-[#706a73]">Proposta de locação</small>
            </div>
            <label className="field mt-5">
              <span>Aluguel mensal</span>
              <input
                type="number"
                min="0"
                value={proposalDraft.rent}
                onChange={(e) =>
                  setProposalDraft({ ...proposalDraft, rent: Number(e.target.value) })
                }
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              <label className="field">
                <span>Condomínio / mês</span>
                <input
                  type="number"
                  min="0"
                  value={proposalDraft.condo}
                  onChange={(e) =>
                    setProposalDraft({ ...proposalDraft, condo: Number(e.target.value) })
                  }
                />
              </label>
              <label className="field">
                <span>IPTU / mês</span>
                <input
                  type="number"
                  min="0"
                  value={proposalDraft.iptu}
                  onChange={(e) =>
                    setProposalDraft({ ...proposalDraft, iptu: Number(e.target.value) })
                  }
                />
              </label>
              <label className="field">
                <span>Início da locação</span>
                <input
                  type="date"
                  value={proposalDraft.startDate}
                  onChange={(e) =>
                    setProposalDraft({ ...proposalDraft, startDate: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Duração do contrato</span>
                <select
                  value={proposalDraft.duration}
                  onChange={(e) => setProposalDraft({ ...proposalDraft, duration: e.target.value })}
                >
                  <option>12 meses</option>
                  <option>24 meses</option>
                  <option>30 meses</option>
                  <option>36 meses</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-[9px] bg-[#f3e7fa] px-2.5 py-2 text-xs">
              <span>Total mensal</span>
              <b className="text-sm text-[#743b96]">{currency(total)}</b>
            </div>
            <label className="field mt-3">
              <span>Mensagem (opcional)</span>
              <textarea
                value={proposalDraft.message}
                onChange={(e) => setProposalDraft({ ...proposalDraft, message: e.target.value })}
                className="h-10 min-h-10 rounded-[8px] border border-[#ddd7e2] px-2.5 py-2 text-[11px] outline-none"
              />
            </label>
            <p className="mt-2 text-[9px] text-[#706a73]">
              O envio não conclui a locação. Aguarde o aceite.
            </p>
            <div className="mt-3 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowProposal(false)}
                className="h-9 w-20 rounded-[8px] border border-[#ddd7e2] text-xs"
              >
                Cancelar
              </button>
              <button className="h-9 flex-1 rounded-[8px] bg-[#743b96] text-xs font-medium text-white">
                Enviar proposta
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

const habits = [
  "Fuma",
  "Ingere bebidas alcoólicas",
  "Trabalha",
  "Possui carro",
  "Possui pets",
  "Está na faculdade",
  "Está em algum relacionamento",
  "Recebe visitas frequentemente",
];

function ProfileIcon({ name }: { name: "person" | "email" | "phone" | "lock" | "calendar" | "moon" | "book" }) {
  const paths = {
    person: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="9" r="3" /><path d="M7 18c.8-2.3 2.4-3.5 5-3.5s4.2 1.2 5 3.5" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    phone: <path d="M7 3h3l1.5 4-2 1.5a15 15 0 0 0 6 6L17 12l4 1.5v3c0 1.4-1.2 2.5-2.6 2.5C10.3 19 5 13.7 5 5.6 5 4.2 5.8 3 7 3Z" />,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22Z" /><path d="M4 5.5v16.2M8 6h8" /></>,
  };
  return <svg aria-hidden="true" className="profile-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Profile({ go }: { go: (screen: Screen) => void }) {
  const { role, setRole } = useContext(RoleContext);
  const { user, setUser } = useContext(UserContext);
  const assignedRoles = rolesForUser(user, role);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(user?.name ?? "Gabriel Sousa");
  const [email, setEmail] = useState(user?.email ?? "gabrielsousa@gmail.com");
  const [phone, setPhone] = useState("+55 (84) 9999-9999");
  const [savedProfile, setSavedProfile] = useState<{ name: string; email: string; phone: string; bio: string } | null>(null);
  const [bio, setBio] = useState(() => role === "Locador"
    ? `Olá! Meu nome é ${user?.name ?? "Roberto Silva"} e sou locador de um apartamento que prezo por manter em boas condições, com organização, tranquilidade e conforto para os moradores.`
    : `Olá! Meu nome é ${user?.name ?? "Gabriel Sousa"} e estou procurando um colega para dividir o apartamento comigo.\nSou uma pessoa tranquila e valorizo bastante um ambiente silencioso e organizado. Procuro alguém que não fume, não tenha pets e que respeite um ambiente mais reservado.`);
  const save = () => {
    setSavedProfile({ name, email, phone, bio });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const cancelEdit = () => {
    if (savedProfile) {
      setName(savedProfile.name);
      setEmail(savedProfile.email);
      setPhone(savedProfile.phone);
      setBio(savedProfile.bio);
    }
    setEditing(false);
  };
  return (
    <main className="min-h-dvh bg-white px-[18px] pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button className="text-2xl" onClick={() => go("home")}>
          ‹
        </button>
        <h1 className="text-sm">Meu perfil</h1>
      </header>
      <img
        src={`${A}/f5420.png`}
        className="mx-auto mt-5 size-20 rounded-full object-cover"
        alt="Foto de perfil de Gabriel Sousa"
      />
      <div className="mt-5 space-y-6">
        <label className="profile-field">
          <span>Nome</span>
          <span className="profile-control">
            <input className="profile-control-input" disabled={!editing} value={name} onChange={(e) => setName(e.target.value)} />
            <ProfileIcon name="person" />
          </span>
        </label>
        <label className="profile-field">
          <span>Email</span>
          <span className="profile-control">
            <input className="profile-control-input" disabled={!editing} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <ProfileIcon name="email" />
          </span>
        </label>
        <label className="profile-field">
          <span>Número de celular</span>
          <span className="profile-control">
            <input className="profile-control-input" disabled={!editing} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <ProfileIcon name="phone" />
          </span>
        </label>
        <label className="profile-field">
          <span>Senha</span>
          <span className="profile-control">
            <input className="profile-control-input" disabled={!editing} type="password" defaultValue="12345678" />
            <ProfileIcon name="lock" />
          </span>
        </label>
        <div>
          <p className="mb-2 text-xs font-medium">Perfil</p>
          <div className="flex flex-wrap gap-2">
            {assignedRoles.map((profile) => (
              <span key={profile} className="profile-pill inline-block">{profile}</span>
            ))}
          </div>
        </div>
        <label className="profile-field">
          <span>{role === "Locador" ? "Sobre o locatário" : "Sobre o anfitrião"}</span>
          <textarea
            disabled={!editing}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
          />
        </label>
        {role !== "Locador" && <>
        <h2 className="text-base font-bold">Compatibilidade</h2>
        <label className="profile-field">
          <span>Gênero</span>
          <select disabled={!editing} defaultValue="">
            <option value="">Não informado</option>
            <option>Masculino</option>
            <option>Feminino</option>
          </select>
        </label>
        <label className="profile-field">
          <span>Idade</span>
          <span className="profile-control">
            <input className="profile-control-input" disabled={!editing} placeholder="Não informada" type="number" />
            <ProfileIcon name="calendar" />
          </span>
        </label>
        {habits.slice(0, 5).map((label) => (
          <ChoiceRow key={label} label={label} options={["Sim", "Não"]} disabled={!editing} compact />
        ))}
        <label className="profile-field">
          <span>Horário de dormir</span>
          <span className="profile-control">
          <select className="profile-control-input" disabled={!editing} defaultValue="">
            <option value="">Não informado</option>
            <option>Cedo</option>
            <option>Tarde</option>
            <option>Varia</option>
          </select>
          <ProfileIcon name="moon" />
          </span>
        </label>
        {habits.slice(5, 6).map((label) => (
          <ChoiceRow key={label} label={label} options={["Sim", "Não"]} disabled={!editing} compact />
        ))}
        <label className="profile-field">
          <span>Curso (se estiver na faculdade)</span>
          <span className="profile-control">
            <input className="profile-control-input" disabled={!editing} placeholder="Não informado" />
            <ProfileIcon name="book" />
          </span>
        </label>
        {habits.slice(6).map((label) => (
          <ChoiceRow key={label} label={label} options={["Sim", "Não"]} disabled={!editing} compact />
        ))}
        </>}
      </div>
      {saved && (
        <p className="notice mt-5 text-center" role="status">
          Perfil atualizado com sucesso.
        </p>
      )}
      <button
        className="mt-8 h-10 w-full rounded-full border border-[#7501dd] bg-[#d9a6f7] text-sm text-[#4e1e79]"
        onClick={() => {
          if (editing) save();
          else {
            setSavedProfile({ name, email, phone, bio });
            setEditing(true);
          }
        }}
      >
        {editing ? "Salvar alterações" : "Editar perfil"}
      </button>
      {editing && (
        <button
          className="mt-3 h-10 w-full rounded-full border border-[#706a73] text-sm"
          onClick={cancelEdit}
        >
          Cancelar
        </button>
      )}
      <button
        type="button"
        className="mt-5 h-10 w-full rounded-full border border-[#ddd7e2] text-sm font-medium text-[#3b3939]"
        onClick={() => {
          setUser(null);
          go("login");
        }}
      >
        Sair da conta
      </button>
      <button type="button" className="mt-5 h-10 w-full rounded-full border border-[#f92d4f] bg-[#fee2e2] text-sm font-semibold text-[#d00000]" onClick={() => setConfirmDelete(true)}>
        Excluir conta
      </button>
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" role="presentation">
          <section className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title" className="text-lg font-semibold">Excluir sua conta?</h2>
            <p className="mt-2 text-sm leading-5 text-[#655e69]">Essa ação encerra este protótipo e leva você de volta à tela de login.</p>
            <button type="button" className="primary-btn mt-5 !h-11 !bg-[#d00000]" onClick={() => go("login")}>Confirmar exclusão</button>
            <button type="button" className="mt-3 h-10 w-full rounded-full border border-[#ddd7e2] text-sm" onClick={() => setConfirmDelete(false)}>Manter minha conta</button>
          </section>
        </div>
      )}
    </main>
  );
}

function LandlordAddAnnouncement({ go }: { go: (screen: Screen) => void }) {
  const [published, setPublished] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    purpose: "Alugar",
    type: "Apartamento",
    title: "Apartamento aconchegante em Pinheiros",
    address: "Rua dos Pinheiros, 120 · São Paulo",
    description: "Apartamento iluminado, com varanda, cozinha equipada e ótima localização. Perto do metrô e de comércios.",
    area: "65",
    rooms: "2",
    bathrooms: "1",
    garage: "1",
    floor: "5º andar",
    price: "R$ 2.300,00",
    additional: "Condomínio: R$ 350,00/mês, IPTU: R$ 80,00/mês, Água, energia e gás: pagos à parte, conforme consumo, Garantia locatícia: caução equivalente a dois meses de aluguel.",
  });
  const update = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const available = Math.max(0, 10 - photos.length);
    const next = Array.from(files).slice(0, available).map((file) => URL.createObjectURL(file));
    setPhotos((current) => [...current, ...next]);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setPublished(true);
  };
  const input = (name: keyof typeof form, label: string, placeholder = "") => (
    <label className="field">
      <span>{label}</span>
      <input value={form[name]} placeholder={placeholder} onChange={(event) => update(name, event.target.value)} />
    </label>
  );
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <LandlordHeader go={go} />
      <div className="flex-1 px-[18px] pb-5">
        <button onClick={() => go("landlord-business")} className="flex items-center gap-2 text-xl font-semibold">
          <span aria-hidden="true" className="text-3xl font-light leading-none">‹</span> Novo anúncio
        </button>
        <p className="mt-1 text-xs text-[#706a73]">Cadastre seu imóvel e encontre o próximo morador.</p>
        <form onSubmit={submit} className="announcement-form mt-5 space-y-3.5">
          <h2 className="text-sm font-semibold">Sobre o imóvel</h2>
          <label className="field">
            <span>Finalidade do anúncio</span>
            <select value={form.purpose} onChange={(event) => update("purpose", event.target.value)}>
              <option>Alugar</option><option>Vender</option>
            </select>
          </label>
          <label className="field">
            <span>Tipo de imóvel</span>
            <select value={form.type} onChange={(event) => update("type", event.target.value)}>
              <option>Apartamento</option><option>Casa</option><option>Kitnet</option><option>Casa comercial</option>
            </select>
          </label>
          {input("title", "Título do anúncio")}
          {input("address", "Endereço")}
          <label className="field">
            <span>Descrição</span>
            <textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
          </label>
          <h2 className="pt-1 text-sm font-semibold">Características do imóvel</h2>
          <div className="grid grid-cols-2 gap-3">
            {input("area", "Área")}
            {input("rooms", "Quartos")}
            {input("bathrooms", "Banheiros")}
            {input("garage", "Vagas de garagem")}
          </div>
          <label className="field">
            <span>Andar</span>
            <select value={form.floor} onChange={(event) => update("floor", event.target.value)}>
              <option>5º andar</option><option>4º andar</option><option>3º andar</option><option>2º andar</option><option>1º andar</option><option>Térreo</option>
            </select>
          </label>
          <label className="field">
            <span>Valor do aluguel mensal</span>
            <input value={form.price} onChange={(event) => update("price", event.target.value)} />
          </label>
          <label className="field">
            <span>Valores adicionais</span>
            <textarea className="additional-costs" value={form.additional} onChange={(event) => update("additional", event.target.value)} />
          </label>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fotos do imóvel</h2>
              <span className="text-[10px] text-[#706a73]">Até 10 fotos</span>
            </div>
            <p className="mt-1 text-xs text-[#706a73]">Mostre os cômodos e os diferenciais do imóvel.</p>
          </div>
          <label className="flex min-h-[90px] cursor-pointer items-center justify-between rounded-[10px] border border-dashed border-[#c36cf1] bg-[#fbf3ff] px-4 text-xs text-[#7501dd]">
            <span className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-white text-lg">◎</span>
              <span><b className="text-sm">Adicionar fotos</b><small className="block text-[9px] text-[#706a73]">JPG ou PNG · Até 10 fotos</small></span>
            </span>
            <b className="text-xl">＋</b>
            <input type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={(event) => addPhotos(event.target.files)} />
          </label>
          {photos.length > 0 && <div className="grid grid-cols-4 gap-2">{photos.map((photo, index) => <img key={photo} src={photo} className="aspect-square w-full rounded-lg object-cover" alt={`Foto ${index + 1} do imóvel`} />)}</div>}
          <button type="submit" className="primary-btn !h-[46px] !bg-[#572288]">＋　Publicar anúncio</button>
          <p className="text-center text-[10px] text-[#706a73]">Você poderá editar ou pausar o anúncio depois.</p>
        </form>
      </div>
      <BottomNav active="landlord-business" go={go} />
      {published && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"><section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#f5e6ff] text-3xl text-[#7501dd]">✓</span><h2 className="mt-4 text-xl font-semibold">Anúncio publicado</h2><p className="mt-2 text-sm text-[#706a73]">Seu imóvel já está cadastrado na plataforma.</p><button onClick={() => go("landlord-business")} className="primary-btn mt-5 !bg-[#572288]">Voltar aos negócios</button></section></div>}
    </main>
  );
}

function AppRouter() {
  const { user } = useContext(UserContext);
  const { role } = useContext(RoleContext);
  const [screen, setScreen] = useState<Screen>("login");
  const [propertyReturnScreen, setPropertyReturnScreen] = useState<Screen>("home");
  const [chatPartner, setChatPartner] = useState<ChatPartner>("landlord");
  const [chatContactName, setChatContactName] = useState<string | undefined>();
  const [historyReturn, setHistoryReturn] = useState<Screen>("home");
  const [filters, setFilters] = useState(initialFilters);
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [landlordDeals, setLandlordDeals] = useState<LandlordDealStatus[]>([
    "Pendente",
    "Em andamento",
    "Concluída",
    "Em andamento",
  ]);
  const [pausedProperties, setPausedProperties] = useState([false, false]);
  const [sentProposal, setSentProposal] = useState<ProposalData | null>(null);
  const [sentDocument, setSentDocument] = useState<SentDocument | null>(null);
  const [hostProperties, setHostProperties] = useState<HostProperty[]>([
    {
      id: 1,
      name: "Condominínio RedeMais",
      address: "Ponta Negra, Rua xxxx",
      area: "65",
      rooms: "2",
      bathrooms: "1",
      garage: "1",
      floor: "5º andar",
      price: "R$ 200",
      image: `${A}/f2a6e.png`,
    },
  ]);
  const [hostRequestAccepted, setHostRequestAccepted] = useState(false);
  const go = (next: Screen) => {
    if (next === "property" || next === "property-roommate" || next === "property-rental") {
      setPropertyReturnScreen(screen);
    }
    if (next === "chat-history" && screen !== "chat-history" && screen !== "chat") {
      const menuScreens: Screen[] = ["home", "profile", "roommate", "proposals", "tenant-business", "landlord-business", "host-requests", "host-offer"];
      setHistoryReturn(menuScreens.includes(screen) ? screen : "home");
    }
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openChat = (partner: ChatPartner, contactName?: string) => {
    setChatPartner(partner);
    setChatContactName(contactName);
    if (screen !== "chat-history" && screen !== "chat") {
      const menuScreens: Screen[] = ["home", "profile", "roommate", "proposals", "tenant-business", "landlord-business", "host-requests", "host-offer"];
      setHistoryReturn(menuScreens.includes(screen) ? screen : "home");
    }
    go("chat");
  };
  if (screen === "login") return <Login go={go} />;
  if (screen === "signup") return <Signup go={go} />;
  if (screen === "filters") return <Filters go={go} filters={filters} setFilters={setFilters} />;
  if (screen === "profile") return <Profile key={user?.id ?? "guest-profile"} go={go} />;
  if (screen === "roommate") return role === "Anfitrião"
    ? <HostOffer go={go} properties={hostProperties} />
    : <Roommate go={go} />;
  if (screen === "map") return <MapView go={go} />;
  if (screen === "property" || screen === "property-roommate")
    return (
      <PropertyDetail
        onBack={() => go(propertyReturnScreen)}
        kind="roommate"
        onConfirm={() => {
          setInterestSubmitted(true);
          go("proposals");
        }}
      />
    );
  if (screen === "property-rental")
    return (
      <PropertyDetail
        onBack={() => go(propertyReturnScreen)}
        kind="rental"
        onConfirm={() => {
          setInterestSubmitted(true);
          go("tenant-business");
        }}
      />
    );
  if (screen === "proposals") return <Proposals go={go} openChat={openChat} interestSubmitted={interestSubmitted} />;
  if (screen === "tenant-business") return <TenantBusiness go={go} openChat={openChat} />;
  if (screen === "host-offer") return <HostOffer go={go} properties={hostProperties} />;
  if (screen === "host-add-property")
    return (
      <HostAddProperty
        go={go}
        onAdd={(property) => setHostProperties([...hostProperties, property])}
      />
    );
  if (screen === "host-candidates") return <HostCandidates go={go} />;
  if (screen === "host-profile") return <HostCandidateProfile go={go} />;
  if (screen === "host-requests")
    return (
      <HostRequests
        go={go}
        accepted={hostRequestAccepted}
        onAccept={() => setHostRequestAccepted(true)}
      />
    );
  if (screen === "landlord-business")
    return (
      <LandlordBusiness
        go={go}
        openChat={openChat}
        deals={landlordDeals}
        setDeals={setLandlordDeals}
        paused={pausedProperties}
        setPaused={setPausedProperties}
        onNewAnnouncement={() => go("landlord-add")}
      />
    );
  if (screen === "landlord-add") return <LandlordAddAnnouncement go={go} />;
  if (screen === "landlord-edit") return <LandlordEdit go={go} />;
  if (screen === "landlord-profile")
    return <Profile go={(next) => go(next === "home" ? "landlord-business" : next)} />;
  if (screen === "chat-history")
    return <ChatHistory go={go} openChat={openChat} proposal={sentProposal} document={sentDocument} backScreen={historyReturn} user={user} />;
  if (screen === "chat")
    return (
      <IndividualChat
        go={go}
        partner={chatPartner}
        contactName={chatContactName}
        proposal={sentProposal}
        setProposal={setSentProposal}
        document={sentDocument}
        setDocument={setSentDocument}
      />
    );
  return (
    <Home
      go={go}
      filters={filters}
      setFilters={setFilters}
      clearFilters={() =>
        setFilters({
          ...initialFilters,
          types: [],
          rooms: "Qualquer",
          baths: "Qualquer",
          garage: "Qualquer",
        })
      }
    />
  );
}

export default function App() {
  const [users, setUsersValue] = useState<MockUser[]>(readMockUsers);
  const [user, setUserValue] = useState<MockUser | null>(() => {
    const userId = window.localStorage.getItem("apto-mock-user-id");
    return readMockUsers().find((account) => account.id === userId) ?? null;
  });
  const [role, setRoleValue] = useState<ProfileRole>(() => {
    const storedRole = window.localStorage.getItem("apto-profile-role");
    if (profileRoles.includes(storedRole as ProfileRole)) return storedRole as ProfileRole;
    return user?.role ?? "Locatário";
  });
  const setRole = (nextRole: ProfileRole) => {
    setRoleValue(nextRole);
    window.localStorage.setItem("apto-profile-role", nextRole);
  };
  const setUser = (nextUser: MockUser | null) => {
    if (!nextUser) {
      setUserValue(null);
      window.localStorage.removeItem("apto-mock-user-id");
      setRole("Locatário");
      return;
    }
    const seed = initialMockUsers.find((account) => account.id === nextUser.id);
    const stableUser = seed ? { ...nextUser, role: seed.role, roles: seed.roles, profileLabel: seed.profileLabel } : nextUser;
    setUserValue(stableUser);
    window.localStorage.setItem("apto-mock-user-id", stableUser.id);
    setRole(stableUser.role);
  };
  const registerUser = (newUser: MockUser) => {
    const nextUsers = [...users, newUser];
    setUsersValue(nextUsers);
    window.localStorage.setItem("apto-users", JSON.stringify(nextUsers));
    setUser(newUser);
  };
  return <RoleContext.Provider value={{ role, setRole }}><UserContext.Provider value={{ user, users, setUser, registerUser }}><AppRouter /></UserContext.Provider></RoleContext.Provider>;
}
