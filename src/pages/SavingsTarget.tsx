
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft, Trash } from "lucide-react";
import SavingsHistory from "@/components/SavingsHistory";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";

interface SavingEntry {
  id: string;
  amount: number;
  saved_at: string;
}

interface SavingsTarget {
  id: string;
  name: string;
  target_amount: number;
  created_at: string;
}

const SavingsTarget = () => {
  const { targetId } = useParams();
  const [currentAmount, setCurrentAmount] = useState<number | "">("");
  const [target, setTarget] = useState<SavingsTarget | null>(null);
  const [savings, setSavings] = useState<SavingEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const totalSaved = savings.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const remaining = target ? target.target_amount - totalSaved : 0;
  const isExceeding = totalSaved > (target?.target_amount || 0);

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (target) {
      const newProgress = (totalSaved / target.target_amount) * 100;
      setProgress(Math.min(newProgress, 100));

      if (newProgress >= 100 && !isExceeding) {
        toast({
          title: "Congratulations! 🎉",
          description: "You've reached your savings target!",
          duration: 5000,
        });
      }
    }
  }, [totalSaved, target, toast, isExceeding]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    loadTargetData();
  };

  const loadTargetData = async () => {
    if (!targetId) return;
    
    try {
      const { data: targetData, error: targetError } = await supabase
        .from('savings_targets')
        .select('*')
        .eq('id', targetId)
        .single();

      if (targetError) throw targetError;
      if (!targetData) {
        navigate('/');
        return;
      }

      setTarget(targetData);

      const { data: savingsData, error: savingsError } = await supabase
        .from('savings_entries')
        .select('*')
        .eq('target_id', targetId)
        .order('saved_at', { ascending: false });

      if (savingsError) throw savingsError;
      setSavings(savingsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentAmount || Number(currentAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!target) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('savings_entries')
        .insert({
          amount: currentAmount,
          target_id: target.id,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setSavings([data, ...savings]);
      setCurrentAmount("");
      
      const newTotal = totalSaved + Number(currentAmount);
      if (newTotal > target.target_amount) {
        toast({
          title: "Wow! 🚀",
          description: `You've exceeded your target by ${formatRupees(newTotal - target.target_amount)}!`,
          className: "bg-primary text-primary-foreground",
        });
      } else {
        toast({
          title: "Amount saved!",
          description: `${formatRupees(Number(currentAmount))} has been added to your savings.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error saving amount",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('savings_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      setSavings(savings.filter(entry => entry.id !== entryId));
      toast({
        title: "Entry deleted",
        description: "The savings entry has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting entry",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTarget = async () => {
    if (!target) return;
    
    try {
      const { error } = await supabase
        .from('savings_targets')
        .delete()
        .eq('id', target.id);

      if (error) throw error;

      toast({
        title: "Target deleted",
        description: "The savings target and all its entries have been removed.",
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error deleting target",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-secondary to-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!target) return null;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-secondary to-background">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteTarget}>
            <Trash className="w-4 h-4 mr-2" />
            Delete Target
          </Button>
        </div>

        <Card className={`p-6 glass-card ${isExceeding ? 'border-primary border-2' : ''}`}>
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-1">{target.name}</h2>
              <p className="text-sm text-muted-foreground">Target</p>
              <p className="text-3xl font-semibold">
                {formatRupees(target.target_amount)}
              </p>
            </div>
            <Progress 
              value={progress} 
              className={`h-2 ${isExceeding ? 'bg-primary/20' : ''}`}
            />
            <div className="flex justify-between text-sm">
              <span className={`${isExceeding ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Saved: {formatRupees(totalSaved)}
              </span>
              <span className="text-muted-foreground">
                {isExceeding ? 'Exceeded by: ' : 'Remaining: '}
                {formatRupees(Math.abs(remaining))}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass-card">
          <div className="space-y-4">
            <h3 className="font-medium">Add New Savings</h3>
            <div className="relative">
              <Input
                type="number"
                placeholder="Enter amount"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(Number(e.target.value))}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleSave}
            >
              <Save className="w-4 h-4" />
              Save Amount
            </Button>
          </div>
        </Card>

        <SavingsHistory 
          entries={savings} 
          formatCurrency={formatRupees} 
          onDelete={handleDeleteEntry}
        />
      </div>
    </div>
  );
};

export default SavingsTarget;
