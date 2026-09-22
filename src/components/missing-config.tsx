import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MissingConfig({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Configuration requise</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Variables manquantes</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {missing.map((name) => <li key={name}>{name}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </main>
  );
}
