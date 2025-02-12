
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

interface SavingEntry {
  id: string;
  amount: number;
  saved_at: string;
}

interface SavingsHistoryProps {
  entries: SavingEntry[];
  formatCurrency: (amount: number) => string;
  onDelete?: (id: string) => void;
}

const SavingsHistory = ({ entries, formatCurrency, onDelete }: SavingsHistoryProps) => {
  if (entries.length === 0) return null;

  return (
    <Card className="p-6 glass-card">
      <h3 className="font-medium mb-4">Savings History</h3>
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg slide-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex flex-col">
              <span className="font-medium">{formatCurrency(entry.amount)}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(entry.saved_at).toLocaleDateString()} at{" "}
                {new Date(entry.saved_at).toLocaleTimeString()}
              </span>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.id);
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default SavingsHistory;
