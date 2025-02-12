
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SavingsTarget {
  id: string;
  name: string;
  target_amount: number;
  created_at: string;
}

const Index = () => {
  const [targetAmount, setTargetAmount] = useState<number | "">("");
  const [targetName, setTargetName] = useState("");
  const [targets, setTargets] = useState<SavingsTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    loadUserData();
  };

  const loadUserData = async () => {
    try {
      const { data: targetsData, error: targetsError } = await supabase
        .from('savings_targets')
        .select('*')
        .order('created_at', { ascending: false });

      if (targetsError) throw targetsError;
      setTargets(targetsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetTarget = async () => {
    if (!targetAmount || Number(targetAmount) <= 0) {
      toast({
        title: "Invalid target amount",
        description: "Please enter a valid target amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!targetName.trim()) {
      toast({
        title: "Invalid target name",
        description: "Please enter a name for your savings target",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('savings_targets')
        .insert({
          name: targetName.trim(),
          target_amount: targetAmount,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setTargets([data, ...targets]);
      setTargetAmount("");
      setTargetName("");
      
      toast({
        title: "Target set!",
        description: `Your savings target "${data.name}" of ${formatRupees(Number(targetAmount))} has been set.`,
      });
    } catch (error: any) {
      toast({
        title: "Error setting target",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-b from-secondary to-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-secondary to-background">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">My Savings Targets</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card className="p-6 glass-card">
          <h2 className="text-lg font-medium mb-4">Create New Target</h2>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Enter target name (e.g., Car, House)"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
            />
            <div className="relative">
              <Input
                type="number"
                placeholder="Enter target amount"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleSetTarget}
            >
              <Plus className="w-4 h-4" />
              Create Target
            </Button>
          </div>
        </Card>

        <div className="grid gap-4">
          {targets.map((target) => (
            <Card
              key={target.id}
              className="p-4 cursor-pointer transition-all hover:scale-105"
              onClick={() => navigate(`/target/${target.id}`)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium mb-2">{target.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Target: {formatRupees(target.target_amount)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
