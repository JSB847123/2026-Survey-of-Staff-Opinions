"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Loader2, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

const FOUR_DIGITS = /^\d{4}$/;

type Account = {
  id: string;
  loginId: string;
  active: boolean;
  responseCount: number;
  createdAt: string;
};

export function RespondentsManager({
  isAdmin,
  maxAccounts,
  initialAccounts,
}: {
  isAdmin: boolean;
  maxAccounts: number;
  initialAccounts: Account[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [newId, setNewId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [creating, setCreating] = useState(false);
  const [pwTarget, setPwTarget] = useState<Account | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

  const reload = async () => {
    const data = await apiFetch<{
      accounts: {
        id: string;
        loginId: string;
        active: boolean;
        createdAt: string;
        _count: { responses: number };
      }[];
    }>("/api/respondents");
    setAccounts(
      data.accounts.map((a) => ({
        id: a.id,
        loginId: a.loginId,
        active: a.active,
        responseCount: a._count.responses,
        createdAt: a.createdAt,
      })),
    );
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!FOUR_DIGITS.test(newId) || !FOUR_DIGITS.test(newPw)) {
      toast.error("ID와 비밀번호는 각각 숫자 4자리여야 합니다.");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/api/respondents", {
        method: "POST",
        body: JSON.stringify({ loginId: newId, password: newPw }),
      });
      toast.success(`계정 ${newId}을(를) 만들었습니다.`);
      setNewId("");
      setNewPw("");
      await reload();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (account: Account, active: boolean) => {
    try {
      await apiFetch(`/api/respondents/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, active } : a)),
      );
      toast.success(
        active
          ? `${account.loginId} 계정을 활성화했습니다.`
          : `${account.loginId} 계정을 비활성화했습니다.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "변경에 실패했습니다.");
    }
  };

  const changePassword = async () => {
    if (!pwTarget) return;
    if (!FOUR_DIGITS.test(pwValue)) {
      toast.error("비밀번호는 숫자 4자리여야 합니다.");
      return;
    }
    setPwSaving(true);
    try {
      await apiFetch(`/api/respondents/${pwTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: pwValue }),
      });
      toast.success(`${pwTarget.loginId} 계정의 비밀번호를 변경했습니다.`);
      setPwTarget(null);
      setPwValue("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "변경에 실패했습니다.");
    } finally {
      setPwSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/respondents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success(`${deleteTarget.loginId} 계정을 삭제했습니다.`);
      setDeleteTarget(null);
      await reload();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">계정 직접 만들기</CardTitle>
            <CardDescription>
              ID와 비밀번호는 각각 숫자 4자리입니다. 응답자 회원 가입과 동일한
              전체 {maxAccounts}개 제한이 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-login-id">ID</Label>
                <Input
                  id="new-login-id"
                  inputMode="numeric"
                  maxLength={4}
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.replace(/\D/g, ""))}
                  placeholder="0001"
                  className="w-28 text-center"
                  disabled={creating || accounts.length >= maxAccounts}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-login-pw">비밀번호</Label>
                <Input
                  id="new-login-pw"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value.replace(/\D/g, ""))}
                  placeholder="0000"
                  className="w-28 text-center"
                  disabled={creating || accounts.length >= maxAccounts}
                />
              </div>
              <Button
                type="submit"
                disabled={creating || accounts.length >= maxAccounts}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                계정 추가
              </Button>
              {accounts.length >= maxAccounts && (
                <p className="text-sm text-muted-foreground">
                  최대 개수({maxAccounts}개)에 도달했습니다.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            계정 생성·변경·삭제는 관리자만 할 수 있습니다. 아래에서 현황을
            확인하세요.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRound className="size-4" aria-hidden /> 계정 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 응답자 계정이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>제출한 설문</TableHead>
                  <TableHead>가입일</TableHead>
                  {isAdmin && <TableHead className="text-right">관리</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.loginId}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={account.active}
                            onCheckedChange={(checked) =>
                              toggleActive(account, Boolean(checked))
                            }
                            aria-label={`${account.loginId} 활성화`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {account.active ? "활성" : "비활성"}
                          </span>
                        </div>
                      ) : (
                        <Badge variant={account.active ? "secondary" : "outline"}>
                          {account.active ? "활성" : "비활성"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.responseCount > 0 ? (
                        <Badge>{account.responseCount}건</Badge>
                      ) : (
                        <Badge variant="outline">없음</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(account.createdAt).toLocaleDateString("ko-KR")}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${account.loginId} 비밀번호 변경`}
                            onClick={() => {
                              setPwTarget(account);
                              setPwValue("");
                            }}
                          >
                            <KeyRound className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${account.loginId} 삭제`}
                            onClick={() => setDeleteTarget(account)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={pwTarget !== null}
        onOpenChange={(open) => !open && setPwTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>
              {pwTarget?.loginId} 계정의 새 비밀번호(숫자 4자리)를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pw-change">새 비밀번호</Label>
            <Input
              id="pw-change"
              inputMode="numeric"
              maxLength={4}
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              className="text-center"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>
              취소
            </Button>
            <Button onClick={changePassword} disabled={pwSaving}>
              {pwSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.loginId} 계정이 삭제됩니다. 이 계정이 제출한
              응답이 있다면 응답도 함께 삭제되며 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
