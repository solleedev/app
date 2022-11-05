import {
    ClockIcon,
    InformationCircleIcon,
    LockClosedIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'
import { BigNumber, ethers } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import {
    nationToken,
    nationPassportRequiredBalance,
    veNationRewardsMultiplier,
    veNationToken,
} from '../lib/config'
import { dateToReadable } from '../lib/date'
import { useNationBalance } from '../lib/nation-token'
import { NumberType, transformNumber } from '../lib/numbers'
import { useAccount } from 'wagmi'
import {
    useVeNationBalance,
    useVeNationCreateLock,
    useVeNationIncreaseLock,
    useVeNationLock,
    useVeNationWithdrawLock,
} from '../lib/ve-token'
import ActionButton, { ActionButtonProps } from '../components/ActionButton'
import { AllowanceWarning } from '../components/AllowanceWarning'
import Balance from '../components/Balance'
import EthersInput from '../components/EthersInput'
import GradientLink from '../components/GradientLink'
import Head from '../components/Head'
import MainCard from '../components/MainCard'
import TimeRange from '../components/TimeRange'

const bigNumberToDate = (bigNumber: any) => {
    return bigNumber && new Date(bigNumber.mul(1000).toNumber())
}

const dateOut = (date: any, { days, years }: any) => {
    if (!date) return
    let dateOut = date
    days && dateOut.setDate(date.getDate() + days)
    years && dateOut.setFullYear(date.getFullYear() + years)
    return dateOut
}

const calculateVeNation = ({
    nationAmount,
    veNationAmount,
    time,
    lockTime,
    max,
}: any) => {
    if (!nationAmount) return 0

    const vestingStart = calculateVestingStart({
        nationAmount,
        veNationAmount,
        lockTime,
    })
    const percentage = (time - vestingStart) / (max - vestingStart)
    const finalVeNationAmount = nationAmount * percentage
    return finalVeNationAmount.toFixed(finalVeNationAmount > 1 ? 2 : 8)
}

const calculateVestingStart = ({
    nationAmount,
    veNationAmount,
    lockTime,
}: any) => {
    const fourYears = 31556926000 * 4
    return lockTime - (veNationAmount / nationAmount) * fourYears
}

export default function Lock() {
    const { address } = useAccount()

    const { data: nationBalance, isLoading: nationBalanceLoading } =
        useNationBalance({ address })

    const { data: veNationBalance, isLoading: veNationBalanceLoading } =
        useVeNationBalance({ address })

    const { data: veNationLock, isLoading: veNationLockLoading } =
        useVeNationLock({ address })

    const [hasLock, setHasLock] = useState<boolean>()
    useEffect(() => {
        !veNationLockLoading && setHasLock(veNationLock && veNationLock.amount.gt(0))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [veNationLock])

    const [hasExpired, setHasExpired] = useState<boolean>()
    useEffect(() => {
        !veNationLockLoading &&
            setHasExpired(
                veNationLock &&
                veNationLock.end.gt(0) &&
                ethers.BigNumber.from(Date.now()).gte(veNationLock.end.mul(1000))
            )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [veNationLock])

    const [lockAmount, setLockAmount] = useState<string>('')

    const oneWeekOut = useMemo(() => dateOut(new Date(), { days: 7 }), [])

    const [lockTime, setLockTime] = useState({
        value: ethers.BigNumber.from(+oneWeekOut),
        formatted: dateToReadable(oneWeekOut),
    } as any)

    const [minMaxLockTime, setMinMaxLockTime] = useState({} as any)

    const [canIncrease, setCanIncrease] = useState({ amount: true, time: true })
    const [wantsToIncrease, setWantsToIncrease] = useState(false)

    useEffect(() => {
        if (hasLock && veNationLock && !wantsToIncrease) {
            !lockAmount && setLockAmount(ethers.utils.formatEther(veNationLock[0]))
            const origTime = {
                value: veNationLock[1],
                formatted: dateToReadable(bigNumberToDate(veNationLock[1])),
            }
            !lockTime.orig &&
                setLockTime({
                    ...origTime,
                    orig: origTime,
                })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLock, veNationLock])

    useEffect(() => {
        if (hasLock && veNationLock) {
            const originalLockDate = dateToReadable(bigNumberToDate(veNationLock[1]))
            setMinMaxLockTime({
                min: originalLockDate,
                max: dateToReadable(dateOut(new Date(), { years: 4 })),
            })
            setCanIncrease({
                amount: (lockAmount &&
                    ethers.utils.parseEther(lockAmount).gt(veNationLock[0])) as boolean,
                time:
                    lockTime?.value &&
                    lockTime.value.gt(
                        +dateOut(bigNumberToDate(veNationLock[1]), { days: 7 })
                    ),
            })
        } else {
            setMinMaxLockTime({
                min: dateToReadable(oneWeekOut),
                max: dateToReadable(dateOut(new Date(), { years: 4 })),
            })
        }
    }, [hasLock, lockAmount, lockTime, veNationLock, oneWeekOut])

    const { createLock } = useVeNationCreateLock()

    const { increaseLock } = useVeNationIncreaseLock({
        currentAmount: veNationLock?.amount || BigNumber.from(0),
        currentTime: veNationLock?.end || BigNumber.from(Date.now())
    })

    const withdraw = useVeNationWithdrawLock()

    const approval = useMemo<ActionButtonProps['approval']>(
        () => ({
            token: nationToken,
            spender: veNationToken,
            amountNeeded: hasLock && veNationLock && veNationLock.amount
                    ? (
                        transformNumber(
                            lockAmount ?? '0',
                            NumberType.bignumber
                        ) as BigNumber
                    ).sub(veNationLock[0])
                    : transformNumber(lockAmount ?? '0', NumberType.bignumber) as BigNumber,
            approveText: 'Approve $NATION',
            allowUnlimited: false,
        }),
        [hasLock, veNationLock, lockAmount]
    )

    return (
        <>
            <Head title="$veNATION" />

            <MainCard title="Lock $NATION to get $veNATION">
                <p className="mb-4">
                    $veNATION enables governance, minting passport NFTs and boosting
                    liquidity rewards (up to {veNationRewardsMultiplier}x).{' '}
                    <GradientLink
                        text="Learn more"
                        href="https://wiki.nation3.org/token/#venation"
                        internal={false}
                        textSize={'md'}
                    ></GradientLink>
                </p>
                {!hasLock ? (
                    <>
                        <p>
                            Your veNATION balance is dynamic and always correlates to the
                            remainder of the time lock. As time passes and the remainder of
                            time lock decreases, your veNATION balance decreases. If you want
                            to increase it, you have to either increase the time lock or add
                            more NATION. $NATION balance stays the same.
                            <br />
                            <br />
                            <span className="font-semibold">
                                {nationPassportRequiredBalance} $veNATION
                            </span>{' '}
                            will be needed to mint a passport NFT.
                            <br />
                            <br />
                            Some examples of how to get to {
                                nationPassportRequiredBalance
                            }{' '}
                            $veNATION:
                        </p>

                        <ul className="list-disc list-inside mb-4">
                            <li>
                                At least {nationPassportRequiredBalance as unknown as number}{' '}
                                $NATION locked for 4 years, or
                            </li>

                            <li>
                                At least{' '}
                                {(nationPassportRequiredBalance as unknown as number) * 2}{' '}
                                $NATION locked for 2 years, or
                            </li>

                            <li>
                                At least{' '}
                                {(nationPassportRequiredBalance as unknown as number) * 4}{' '}
                                $NATION locked for 1 year
                            </li>
                        </ul>

                        <div className="alert mb-4">
                            <div>
                                <InformationCircleIcon className="h-24 w-24 text-n3blue" />
                                <span>
                                    We suggest you to obtain at least{' '}
                                    {nationPassportRequiredBalance || 0 + 0.5} $veNATION if you
                                    want to mint a passport NFT, since $veNATION balance drops
                                    over time. If it falls below the required threshold, your
                                    passport can be revoked. You can always lock more $NATION
                                    later.
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    ''
                )}
                {hasLock && (
                    <>
                        <div className="stats stats-vertical lg:stats-horizontal shadow mb-4">
                            <div className="stat">
                                <div className="stat-figure text-primary">
                                    <SparklesIcon className="h-8 w-8" />
                                </div>
                                <div className="stat-title">Your $veNATION</div>
                                <div className="stat-value text-primary">
                                    <Balance
                                        balance={veNationBalance?.value}
                                        loading={veNationBalanceLoading}
                                        decimals={
                                            veNationBalance &&
                                                veNationBalance.value.gt(ethers.utils.parseEther('1'))
                                                ? 2
                                                : 6
                                        }
                                    />
                                </div>
                            </div>

                            <div className="stat">
                                <div className="stat-figure text-secondary">
                                    <LockClosedIcon className="h-8 w-8" />
                                </div>
                                <div className="stat-title">Your locked $NATION</div>
                                <div className="stat-value text-secondary">
                                    <Balance
                                        balance={veNationLock && veNationLock[0]}
                                        loading={veNationLockLoading}
                                        decimals={2}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="stats stats-vertical lg:stats-horizontal shadow mb-4">
                            <div className="stat">
                                <div className="stat-figure">
                                    <ClockIcon className="h-8 w-8" />
                                </div>
                                <div className="stat-title">Your lock expiration date</div>
                                <div className="stat-value">
                                    {veNationLock &&
                                        dateToReadable(bigNumberToDate(veNationLock[1]))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="card bg-base-100 shadow overflow-visible">
                    <div className="card-body">
                        <div className="form-control">
                            {!hasExpired ? (
                                <>
                                    <p className="mb-4">
                                        Available to lock:{' '}
                                        <Balance
                                            balance={nationBalance?.formatted}
                                            loading={nationBalanceLoading}
                                        />{' '}
                                        $NATION
                                    </p>
                                    <label className="label">
                                        <span className="label-text">
                                            Lock amount
                                            <br />
                                            <span className="text-xs">
                                                This is the final total amount. To increase it, enter
                                                your current amount plus the amount you want to
                                                increase.
                                            </span>
                                        </span>
                                    </label>
                                    <div className="input-group mb-4">
                                        <EthersInput
                                            type="number"
                                            placeholder="0"
                                            id="lockAmount"
                                            className="input input-bordered w-full"
                                            value={lockAmount}
                                            min={
                                                veNationLock
                                                    ? ethers.utils.formatEther(veNationLock[0])
                                                    : 0
                                            }
                                            onChange={(value: any) => {
                                                setLockAmount(value)
                                                setWantsToIncrease(true)
                                            }}
                                        />

                                        <button
                                            className="btn btn-outline"
                                            onClick={() => {
                                                setLockAmount(
                                                    veNationLock
                                                        ? ethers.utils.formatEther(
                                                            veNationLock.amount.add(nationBalance?.value || 0)
                                                        )
                                                        : nationBalance?.formatted || ''
                                                )
                                                setWantsToIncrease(true)
                                            }}
                                        >
                                            Max
                                        </button>
                                    </div>
                                    <label className="label">
                                        <span className="label-text">
                                            Lock expiration date
                                            <br />
                                            <span className="text-xs">
                                                {hasLock && veNationLock
                                                    ? 'Maximum four years from now.'
                                                    : 'Minimum one week, maximum four years from now.'}
                                            </span>
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        placeholder="Expiration date"
                                        className="input input-bordered w-full"
                                        value={lockTime.formatted}
                                        min={minMaxLockTime.min}
                                        max={minMaxLockTime.max}
                                        onChange={(e: any) => {
                                            if (e.target.value < minMaxLockTime.min) {
                                                return false
                                            }
                                            setLockTime({
                                                ...lockTime,
                                                formatted: e.target.value
                                                    ? e.target.value
                                                    : lockTime.orig.formatted,
                                                value: e.target.value
                                                    ? ethers.BigNumber.from(Date.parse(e.target.value))
                                                    : lockTime.orig.value,
                                            })
                                            setWantsToIncrease(!!e.target.value)
                                        }}
                                    />

                                    <TimeRange
                                        time={Date.parse(lockTime.formatted)}
                                        min={Date.parse(minMaxLockTime.min)}
                                        max={Date.parse(minMaxLockTime.max)}
                                        displaySteps={!hasLock}
                                        onChange={(newDate: any) => {
                                            setLockTime({
                                                ...lockTime,
                                                formatted: dateToReadable(newDate),
                                                value: ethers.BigNumber.from(Date.parse(newDate)),
                                            })
                                            setWantsToIncrease(true)
                                        }}
                                    />
                                    {wantsToIncrease ? (
                                        <p>
                                            Your final balance will be approx{' '}
                                            {calculateVeNation({
                                                nationAmount: lockAmount && +lockAmount,
                                                veNationAmount: transformNumber(
                                                    veNationBalance?.value || 0,
                                                    NumberType.number
                                                ),
                                                time: Date.parse(lockTime.formatted),
                                                lockTime: Date.parse(new Date().toString()),
                                                max: Date.parse(minMaxLockTime.max),
                                            })}{' '}
                                            $veNATION
                                        </p>
                                    ) : (
                                        ''
                                    )}
                                    <div className="card-actions mt-4">
                                        <ActionButton
                                            className={`btn btn-primary normal-case font-medium w-full ${!(canIncrease.amount || canIncrease.time)
                                                ? 'btn-disabled'
                                                : ''
                                                }`}
                                            action={() => {
                                                const amount = ethers.utils.parseUnits(lockAmount)
                                                const time = lockTime.value.div(1000)

                                                if (hasLock) {
                                                    increaseLock(amount, time)
                                                } else {
                                                    createLock(amount, time)
                                                }
                                            }}
                                            approval={approval}
                                        >
                                            {!hasLock
                                                ? 'Lock'
                                                : `Increase lock ${canIncrease.amount ? 'amount' : ''
                                                } ${canIncrease.amount && canIncrease.time ? '&' : ''
                                                } ${canIncrease.time ? 'time' : ''}`}
                                        </ActionButton>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p>Your previous lock has expired, you need to withdraw </p>

                                    <div className="card-actions mt-4">
                                        <ActionButton
                                            className="btn btn-primary normal-case font-medium w-full"
                                            action={withdraw}
                                        >
                                            Withdraw
                                        </ActionButton>
                                    </div>
                                </>
                            )}
                        </div>
                        <AllowanceWarning token={nationToken} spender={veNationToken} />
                    </div>
                </div>
            </MainCard>
        </>
    )
}
