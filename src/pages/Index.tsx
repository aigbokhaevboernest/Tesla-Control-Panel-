import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Welcome";
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-2 text-sm text-muted-foreground">Main app goes here.</p>
      </div>
    </main>
  );
};

export default Index;
