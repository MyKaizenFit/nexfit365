# Decision helper: whether deploy.sh should turn maintenance OFF on exit.
#
# A) maintenance was OFF at start → deploy may enable it → disable on exit
# B) maintenance was already ON → leave it ON
#
# Usage:
#   should_disable_deploy_maintenance <was_already> <enabled_by_this_deploy>
#   echo 0 = keep ON / skip disable
#   echo 1 = disable
should_disable_deploy_maintenance() {
  local was_already="${1:-false}"
  local enabled_by_deploy="${2:-false}"
  if [ "$was_already" = true ]; then
    echo 0
    return 0
  fi
  if [ "$enabled_by_deploy" = true ]; then
    echo 1
    return 0
  fi
  echo 0
}
