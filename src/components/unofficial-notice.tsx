export function UnofficialNotice() {
  return (
    <aside
      aria-label="Aviso importante"
      className="mx-auto w-full max-w-6xl px-5 pb-5 text-xs leading-5 text-muted-foreground sm:px-8"
    >
      <div>
        <p>
          <strong>Site não oficial e sem afiliação à Receita Federal.</strong>{" "}
          Confira as informações no edital oficial antes de qualquer lance.
        </p>
      </div>
    </aside>
  );
}
