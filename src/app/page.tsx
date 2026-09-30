import CreateGroup from "./CreateGroup";
import s from "./ui.module.css";

export default function Home() {
  return (
    <main className={s.page} style={{ maxWidth: 560 }}>
      <span className={s.brand}>Overlap</span>
      <h1 className={s.title}>Find a time that works for everyone</h1>
      <p className={s.sub}>
        Start a group and share the link. Each friend adds their Google Calendar once. After that, the group page shows
        when everyone is free. Event names stay private; only busy times are used.
      </p>
      <CreateGroup />
    </main>
  );
}
